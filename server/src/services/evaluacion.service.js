import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { Materia } from "../models/academico.models/materia.js";
import { ConfiguracionExamen } from "../models/evaluacion.models/configuracionExamen.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";

// 🔥 CAMBIO: el límite fijo ahora aplica a EXAMEN, no a TEST.
const PREGUNTAS_MODO_EXAMEN = 30;
const TOLERANCIA_TIEMPO_MIN = 2;

export class EvaluacionService {
  static #mezclarYCortar(arreglo, cantidad) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, cantidad);
  }

  // 🔥 NUEVO: helper genérico para mezclar un arreglo completo (usado en opciones)
  static #mezclarArreglo(arreglo) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  // 🔥 CAMBIO: lógica invertida — EXAMEN se limita a 30, TEST trae todas.
  static #calcularCantidadPreguntas(modo, totalDisponibles) {
    if (modo === "EXAMEN") {
      return Math.min(PREGUNTAS_MODO_EXAMEN, totalDisponibles);
    }
    return totalDisponibles; // TEST: todas las preguntas activas
  }

  // 🔥 NUEVO: arma el mapa id_pregunta -> opciones, ya mezcladas al azar.
  static #buildOpcionesPorPreguntaMezcladas(opcionesDB) {
    const opcionesPorPregunta = opcionesDB.reduce((acc, opcion) => {
      const raw = opcion.get({ plain: true });
      if (!acc[raw.id_pregunta]) acc[raw.id_pregunta] = [];
      acc[raw.id_pregunta].push({ id_opcion: raw.id_opcion, texto: raw.texto });
      return acc;
    }, {});

    for (const idPregunta in opcionesPorPregunta) {
      opcionesPorPregunta[idPregunta] = EvaluacionService.#mezclarArreglo(
        opcionesPorPregunta[idPregunta],
      );
    }

    return opcionesPorPregunta;
  }

  static #buildDetalleDTO(detalle) {
    return {
      id_pregunta: detalle.id_pregunta,
      id_opcion_elegida: detalle.id_opcion_elegida,
      es_correcta: detalle.es_correcta_snapshot,
      puntos_obtenidos: detalle.puntos_obtenidos,
    };
  }

  // ─── Iniciar examen ──────────────────────────────────────────────────────────

  /**
   * Valida reglas de negocio, genera el conjunto aleatorio de preguntas
   * (y de opciones por pregunta) y registra el intento EN_PROGRESO en BD.
   */
  static async iniciarExamen(id_usuario, id_configuracion, esAdmin = false) {
    // ── Fase 1: Validaciones previas (lecturas sin transacción) ──────────────
    const configuracion = await ConfiguracionExamen.findByPk(id_configuracion);
    if (!configuracion) {
      throw new Error("NO_ENCONTRADO: Configuración de examen no encontrada.");
    }

    if (!esAdmin) {
      const inscripcion = await Inscripcion.findOne({
        where: {
          id_usuario,
          id_materia: configuracion.id_materia,
          activo: true,
        },
        attributes: ["id_usuario"],
      });
      if (!inscripcion) {
        throw new Error(
          "RESTRICCION: No está inscrito en esta materia, o la inscripción está desactivada.",
        );
      }
    }

    const intentosFinalizados = await Intento.count({
      where: {
        id_usuario,
        id_config: id_configuracion,
        estado: "FINALIZADO",
      },
    });
    if (intentosFinalizados >= configuracion.intentos_permitidos) {
      throw new Error(
        `RESTRICCION: Ha alcanzado el límite de ${configuracion.intentos_permitidos} intento(s) permitido(s).`,
      );
    }

    const intentoEnProgreso = await Intento.findOne({
      where: { id_usuario, id_config: id_configuracion, estado: "EN_PROGRESO" },
      attributes: ["id_intento"],
    });
    if (intentoEnProgreso) {
      const err = new Error("INTENTO_EN_PROGRESO");
      err.id_intento = intentoEnProgreso.id_intento;
      throw err;
    }

    const preguntasDisponibles = await BancoPregunta.findAll({
      where: { id_materia: configuracion.id_materia, activo: true },
      attributes: ["id_pregunta", "enunciado", "url_imagen", "tipo_pregunta", "estructura_json"],
    });

    if (preguntasDisponibles.length === 0) {
      throw new Error(
        "ESTADO_INVALIDO: No hay preguntas activas disponibles para este examen.",
      );
    }

    const cantidad = EvaluacionService.#calcularCantidadPreguntas(
      configuracion.modo,
      preguntasDisponibles.length,
    );

    // Mezcla y recorta el conjunto de preguntas (orden aleatorio + cantidad según modo)
    const preguntasSeleccionadas = EvaluacionService.#mezclarYCortar(
      preguntasDisponibles,
      cantidad,
    );

    const idsPreguntas = preguntasSeleccionadas.map((p) => p.id_pregunta);
    const todasLasOpciones = await OpcionRespuesta.findAll({
      where: { id_pregunta: idsPreguntas },
      attributes: ["id_opcion", "id_pregunta", "texto"],
    });

    // 🔥 CAMBIO: las opciones de cada pregunta también se mezclan al azar.
    const opcionesPorPregunta =
      EvaluacionService.#buildOpcionesPorPreguntaMezcladas(todasLasOpciones);

    const t = await sequelize.transaction();
    let intento;
    try {
      intento = await Intento.create(
        {
          id_usuario,
          id_config: id_configuracion,
          fecha_inicio: new Date(),
          estado: "EN_PROGRESO",
          // 🔥 NUEVO: guardar cuántas preguntas tiene este examen y cuáles
          // son, en el orden sorteado. Permite calcular nota correctamente
          // (dividir entre total, no entre respondidas) y retomarExamen
          // con exactamente el mismo subconjunto de preguntas.
          total_preguntas: cantidad,
          preguntas_ids: preguntasSeleccionadas.map((p) => p.id_pregunta),
        },
        { transaction: t },
      );
      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }

    // ── Fase 4: Construir DTO en memoria (sin riesgo de inconsistencia) ────────
    const preguntasConOpciones = preguntasSeleccionadas.map((p) => {
      const raw = p.get({ plain: true });
      return {
        id_pregunta: raw.id_pregunta,
        enunciado: raw.enunciado,
        url_imagen: raw.url_imagen ?? null,
        tipo_pregunta: raw.tipo_pregunta,
        estructura_json: raw.estructura_json,
        opciones: opcionesPorPregunta[raw.id_pregunta] ?? [],
      };
    });

    return {
      id_intento: intento.id_intento,
      configuracion: {
        modo: configuracion.modo,
        tiempo_limite_min: configuracion.tiempo_limite_min,
        intentos_permitidos: configuracion.intentos_permitidos,
        intentos_realizados: intentosFinalizados,
        intentos_restantes:
          configuracion.intentos_permitidos - intentosFinalizados - 1,
      },
      total_preguntas: preguntasConOpciones.length,
      preguntas: preguntasConOpciones,
    };
  }

  // ─── Enviar examen ───────────────────────────────────────────────────────────

  static async enviarExamen(id_intento, id_usuario, respuestasUsuario) {
    if (!Array.isArray(respuestasUsuario)) {
      throw new Error("VALIDACION: El formato de las respuestas es inválido.");
    }

    const t = await sequelize.transaction();

    try {
      const intento = await Intento.findOne({
        where: { id_intento, id_usuario, estado: "EN_PROGRESO" },
        transaction: t,
      });
      if (!intento) {
        throw new Error(
          "NO_ENCONTRADO: Intento no encontrado o ya fue finalizado.",
        );
      }

      const configuracion = await ConfiguracionExamen.findByPk(
        intento.id_config,
        { transaction: t },
      );

      const ahora = new Date();
      const minutosTranscurridos =
        (ahora.getTime() - new Date(intento.fecha_inicio).getTime()) / 60000;

      if (
        configuracion.tiempo_limite_min &&
        minutosTranscurridos >
          configuracion.tiempo_limite_min + TOLERANCIA_TIEMPO_MIN
      ) {
        // Tiempo expirado: finalizar con las respuestas que llegaron (puede ser [])
        // En lugar de rechazar, cerramos el intento con nota 0 si no hay respuestas
        // para que el estudiante no quede bloqueado indefinidamente.
        await intento.update(
          { estado: "FINALIZADO", fecha_fin: new Date(), nota_final: 0 },
          { transaction: t },
        );
        await t.commit();
        return {
          nota_final: 0,
          preguntas_correctas: 0,
          total_preguntas: 0,
          porcentaje: 0,
          intentos_restantes: null,
          tiempo_expirado: true,
        };
      }

      // ── FIX CRÍTICO: Validar que las preguntas respondidas pertenecen ────────
      // al intento actual (vía la configuración → materia)
      const idsRespuestasPregunta = [
        ...new Set(respuestasUsuario.map((r) => r.id_pregunta)),
      ];

      const preguntasValidas = await BancoPregunta.findAll({
        where: {
          id_pregunta: idsRespuestasPregunta,
          id_materia: configuracion.id_materia,
          activo: true,
        },
        attributes: ["id_pregunta", "tipo_pregunta", "estructura_json"],
        transaction: t,
      });

      const idsValidos = new Set(preguntasValidas.map((p) => p.id_pregunta));
      const preguntasMap = new Map(preguntasValidas.map((p) => [p.id_pregunta, p]));

      for (const r of respuestasUsuario) {
        if (!idsValidos.has(r.id_pregunta)) {
          throw new Error(
            `VALIDACION: La pregunta ${r.id_pregunta} no pertenece a este examen.`,
          );
        }
      }

      // ── Cargar todas las opciones de las preguntas ──────────
      const opcionesDB = await OpcionRespuesta.findAll({
        where: { id_pregunta: idsRespuestasPregunta },
        transaction: t,
      });

      const opcionesPorPregunta = new Map();
      const opcionesPorId = new Map();
      for (const op of opcionesDB) {
        const plain = op.get({ plain: true });
        opcionesPorId.set(plain.id_opcion, plain);
        if (!opcionesPorPregunta.has(plain.id_pregunta)) {
          opcionesPorPregunta.set(plain.id_pregunta, []);
        }
        opcionesPorPregunta.get(plain.id_pregunta).push(plain);
      }

      // ── Calificar ────────────────────────────────────────────────────────────
      let totalCorrectas = 0;
      const detallesAInsertar = [];

      for (const respuesta of respuestasUsuario) {
        const pDb = preguntasMap.get(respuesta.id_pregunta);
        const tipo = pDb?.tipo_pregunta;
        const estructura = pDb?.estructura_json;

        if (tipo === "SELECCION_MULTIPLE") {
          const opcionesPregunta = opcionesPorPregunta.get(respuesta.id_pregunta) || [];
          const correctasIds = opcionesPregunta.filter((o) => o.es_correcta).map((o) => o.id_opcion);
          
          const raw = respuesta.respuesta_json;
          const elegidasIds = Array.isArray(raw) ? raw : (raw?.opciones_ids || []);

          const esCorrecta = elegidasIds.length === correctasIds.length && elegidasIds.every((id) => correctasIds.includes(id));
          const puntos = esCorrecta ? 1.0 : 0.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { opciones_ids: elegidasIds },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else if (tipo === "ORDENAR") {
          const correctOrder = estructura?.respuesta?.orden_ids || [];
          const raw = respuesta.respuesta_json;
          const userOrder = Array.isArray(raw) ? raw : (raw?.orden_ids || []);
          
          let hits = 0;
          for (let i = 0; i < correctOrder.length; i++) {
            if (String(userOrder[i]) === String(correctOrder[i])) hits++;
          }
          
          const puntos = correctOrder.length ? hits / correctOrder.length : 0;
          const esCorrecta = puntos === 1.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { orden_ids: userOrder },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else if (tipo === "COMPLETAR") {
          const aceptadasArr = estructura?.respuesta?.aceptadas || [];
          const raw = respuesta.respuesta_json;
          const userSlots = Array.isArray(raw?.espacios) ? raw.espacios : (Array.isArray(raw) ? raw : []);
          
          const userMap = new Map();
          userSlots.forEach(s => {
            userMap.set(String(s.espacio_id), String(s.respuesta || "").trim().toLowerCase());
          });

          let hits = 0;
          for (const config of aceptadasArr) {
            const userVal = userMap.get(String(config.espacio_id));
            const possibleVals = (config.valores || []).map(v => String(v).trim().toLowerCase());
            if (userVal && possibleVals.includes(userVal)) {
              hits++;
            }
          }

          const puntos = aceptadasArr.length ? hits / aceptadasArr.length : 0;
          const esCorrecta = puntos === 1.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { espacios: userSlots },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else {
          const opcion = opcionesPorId.get(respuesta.id_opcion);

          if (!opcion) {
            throw new Error(
              `VALIDACION: La opción ${respuesta.id_opcion} no existe en el sistema.`,
            );
          }
          if (opcion.id_pregunta !== respuesta.id_pregunta) {
            throw new Error(
              `VALIDACION: La opción ${respuesta.id_opcion} no corresponde a la pregunta ${respuesta.id_pregunta}.`,
            );
          }

          const esCorrecta = opcion.es_correcta === true;
          const puntos = esCorrecta ? 1.0 : 0.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: respuesta.id_opcion,
            es_correcta_snapshot: esCorrecta, // blindaje histórico en BD
            puntos_obtenidos: puntos,
          });
        }
      }

      // ── FIX N+1: Inserción masiva del historial ──────────────────────────────
      await DetalleIntento.bulkCreate(detallesAInsertar, { transaction: t });

      const totalRespondidas = detallesAInsertar.length;

      // 🔥 CAMBIO: usar el total real del examen como denominador.
      // intento.total_preguntas se guardó al crear el intento en iniciarExamen.
      // Si es null (intentos legacy anteriores a este cambio), fallback a
      // totalRespondidas para no romper comportamiento previo.
      const totalExamen = intento.total_preguntas || totalRespondidas;
      const notaFinal =
        totalExamen > 0
          ? parseFloat(((totalCorrectas / totalExamen) * 10).toFixed(2))
          : 0;

      await intento.update(
        { fecha_fin: ahora, estado: "FINALIZADO", nota_final: notaFinal },
        { transaction: t },
      );

      await t.commit();

      // ── DTO de respuesta — expone resultado completo (decisión confirmada) ────
      return {
        id_intento: intento.id_intento,
        estado: "FINALIZADO",
        nota_final: notaFinal,
        preguntas_correctas: totalCorrectas,
        total_preguntas: totalExamen,
        porcentaje: parseFloat(
          ((totalCorrectas / totalExamen) * 100).toFixed(1),
        ),
        detalle: detallesAInsertar.map(EvaluacionService.#buildDetalleDTO),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Retomar intento en progreso ────────────────────────────────────────────

  /**
   * Carga un intento EN_PROGRESO con exactamente el mismo subconjunto de
   * preguntas (y en el mismo orden) que se sorteó en iniciarExamen,
   * usando preguntas_ids guardado en el intento.
   * Si preguntas_ids es null (intento legacy), hace fallback a cargar
   * todas las preguntas activas de la materia.
   */
  static async retomarExamen(id_intento, id_usuario) {
    const intento = await Intento.findOne({
      where: { id_intento, id_usuario, estado: "EN_PROGRESO" },
      include: [{ model: ConfiguracionExamen, as: "configuracion" }],
    });

    if (!intento) {
      throw new Error("NO_ENCONTRADO: Intento en progreso no encontrado.");
    }

    const configuracion = intento.configuracion;
    const preguntasIdsGuardados = intento.preguntas_ids; // array ordenado o null

    let preguntas;

    if (Array.isArray(preguntasIdsGuardados) && preguntasIdsGuardados.length > 0) {
      // 🔥 NUEVO: cargar exactamente las preguntas del intento original, en
      // el orden guardado (findAll no garantiza orden, lo reordenamos abajo).
      const rows = await BancoPregunta.findAll({
        where: {
          id_pregunta: preguntasIdsGuardados,
          activo: true,
        },
        attributes: ["id_pregunta", "enunciado", "url_imagen", "tipo_pregunta", "estructura_json"],
      });

      // Reordenar según el orden original sorteado
      const rowsMap = new Map(rows.map((r) => [r.id_pregunta, r]));
      preguntas = preguntasIdsGuardados
        .map((id) => rowsMap.get(id))
        .filter(Boolean);
    } else {
      // Fallback legacy: cargar todas las preguntas activas de la materia
      preguntas = await BancoPregunta.findAll({
        where: { id_materia: configuracion.id_materia, activo: true },
        attributes: ["id_pregunta", "enunciado", "url_imagen", "tipo_pregunta", "estructura_json"],
      });
    }

    const idsPreguntas = preguntas.map((p) =>
      typeof p.id_pregunta !== "undefined" ? p.id_pregunta : p.get("id_pregunta"),
    );

    const opciones = await OpcionRespuesta.findAll({
      where: { id_pregunta: idsPreguntas },
      attributes: ["id_opcion", "id_pregunta", "texto"],
    });

    // Las opciones se mezclan al azar (el orden original de opciones no se
    // guarda, pero no importa porque la calificación usa id_opcion, no posición)
    const opcionesPorPregunta =
      EvaluacionService.#buildOpcionesPorPreguntaMezcladas(opciones);

    const preguntasConOpciones = preguntas.map((p) => {
      const raw = typeof p.get === "function" ? p.get({ plain: true }) : p;
      return {
        id_pregunta: raw.id_pregunta,
        enunciado: raw.enunciado,
        url_imagen: raw.url_imagen ?? null,
        tipo_pregunta: raw.tipo_pregunta,
        estructura_json: raw.estructura_json,
        opciones: opcionesPorPregunta[raw.id_pregunta] ?? [],
      };
    });

    return {
      id_intento: intento.id_intento,
      configuracion: {
        modo: configuracion.modo,
        tiempo_limite_min: configuracion.tiempo_limite_min,
        intentos_permitidos: configuracion.intentos_permitidos,
      },
      total_preguntas: preguntasConOpciones.length,
      preguntas: preguntasConOpciones,
    };
  }

  // ─── Obtener intento ─────────────────────────────────────────────────────────

  /**
   * Retorna el DTO de un intento específico con sus respuestas y configuración.
   * Solo accesible por el propietario del intento (id_usuario en el where).
   */
  static async obtenerIntento(id_intento, id_usuario) {
    const intento = await Intento.findOne({
      where: { id_intento, id_usuario },
      include: [
        {
          model: DetalleIntento,
          as: "respuestas_detalle",
          include: [
            {
              model: BancoPregunta,
              as: "pregunta_banco",
              attributes: ["id_pregunta", "enunciado", "tipo_pregunta", "estructura_json"],
              include: [
                {
                  model: OpcionRespuesta,
                  as: "opciones",
                  attributes: ["id_opcion", "texto", "es_correcta"],
                  required: false,
                },
              ],
            },
            {
              model: OpcionRespuesta,
              as: "opcion_marcada",
              attributes: ["id_opcion", "texto"],
              required: false,
            },
          ],
        },
        {
          model: ConfiguracionExamen,
          as: "configuracion",
          include: [
            {
              model: Materia,
              attributes: ["id_materia", "nombre"],
            },
          ],
        },
      ],
    });

    if (!intento) {
      throw new Error("NO_ENCONTRADO: Intento no encontrado.");
    }

    return intento.get({ plain: true });
  }

  // ─── Historial ───────────────────────────────────────────────────────────────

  /**
   * Retorna todos los intentos FINALIZADOS del usuario, ordenados por fecha desc.
   * Incluye materia y configuración para que el frontend pueda renderizar
   * el historial sin queries adicionales.
   */
  static async obtenerHistorial(id_usuario) {
    const intentos = await Intento.findAll({
      where: { id_usuario, estado: "FINALIZADO" },
      include: [
        {
          model: ConfiguracionExamen,
          as: "configuracion",
          include: [
            {
              model: Materia,
              attributes: ["id_materia", "nombre"],
            },
          ],
        },
      ],
      attributes: [
        "id_intento",
        "fecha_inicio",
        "fecha_fin",
        "nota_final",
        "estado",
      ],
      order: [["fecha_fin", "DESC"]],
    });

    // Para cada intento, contar las preguntas correctas
    const intentosConDetalles = await Promise.all(
      intentos.map(async (intento) => {
        const plain = intento.get({ plain: true });
        
        // Contar preguntas correctas
        const correctas = await DetalleIntento.count({
          where: {
            id_intento: plain.id_intento,
            es_correcta_snapshot: true,
          },
        });
        
        // Contar total de preguntas respondidas
        const total = await DetalleIntento.count({
          where: { id_intento: plain.id_intento },
        });
        
        return {
          ...plain,
          preguntas_correctas: correctas,
          total_preguntas: total,
        };
      })
    );

    return intentosConDetalles;
  }

  // ─── Configuraciones por materia ─────────────────────────────────────────────

  /**
   * Retorna todas las configuraciones de examen de una materia.
   * Usado por el frontend para mostrar los modos disponibles (TEST / EXAMEN)
   * antes de que el estudiante inicie una evaluación.
   *
   * Incluye conteo de preguntas activas para que el frontend pueda
   * advertir si no hay preguntas disponibles.
   *
   * No filtra por usuario — cualquier alumno autenticado puede ver
   * qué configuraciones existen para una materia.
   */
  static async obtenerConfiguracionesPorMateria(id_materia) {
    if (!id_materia) {
      throw new Error("VALIDACION: El id_materia es requerido.");
    }

    // Verificar que la materia existe
    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia", "nombre"],
    });
    if (!materia) {
      throw new Error("NO_ENCONTRADO: La materia no existe.");
    }

    const configuraciones = await ConfiguracionExamen.findAll({
      where: { id_materia },
      order: [["modo", "ASC"]], // EXAMEN antes que TEST alfabéticamente — ajustar si se prefiere
    });

    // Conteo de preguntas activas — 1 sola query, no N+1
    const totalPreguntas = await BancoPregunta.count({
      where: { id_materia, activo: true },
    });

    return {
      materia: materia.get({ plain: true }),
      total_preguntas_activas: totalPreguntas,
      configuraciones: configuraciones.map((c) => {
        const raw = c.get({ plain: true });
        return {
          id_config: raw.id_config,
          modo: raw.modo, // "TEST" | "EXAMEN"
          tiempo_limite_min: raw.tiempo_limite_min, // null = sin límite
          intentos_permitidos: raw.intentos_permitidos,
        };
      }),
    };
  }

  // ─── Upsert configuración (Admin) ────────────────────────────────────────────

  /**
   * Crea o actualiza la configuración de un modo para una materia.
   * Regla: máximo 1 configuración por modo por materia.
   *   - Si no existe → INSERT
   *   - Si ya existe → UPDATE (upsert semántico)
   *
   * Campos admitidos:
   *   modo               → "TEST" | "EXAMEN"  (requerido)
   *   tiempo_limite_min  → entero > 0 | null (sin límite)
   *   intentos_permitidos → entero ≥ 1 (default 1)
   */
  static async upsertConfiguracion(id_materia, datos) {
    const { modo, tiempo_limite_min, intentos_permitidos } = datos;

    // Validaciones de entrada
    if (!id_materia) throw new Error("VALIDACION: El id_materia es requerido.");
    if (!modo || !["TEST", "EXAMEN"].includes(modo)) {
      throw new Error("VALIDACION: El modo debe ser 'TEST' o 'EXAMEN'.");
    }
    if (
      intentos_permitidos !== undefined &&
      (isNaN(intentos_permitidos) || intentos_permitidos < 1)
    ) {
      throw new Error(
        "VALIDACION: intentos_permitidos debe ser un entero ≥ 1.",
      );
    }
    if (
      tiempo_limite_min !== undefined &&
      tiempo_limite_min !== null &&
      (isNaN(tiempo_limite_min) || tiempo_limite_min < 1)
    ) {
      throw new Error(
        "VALIDACION: tiempo_limite_min debe ser un entero > 0 o null.",
      );
    }

    // Verificar materia
    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia"],
    });
    if (!materia) throw new Error("NO_ENCONTRADO: La materia no existe.");

    // Buscar configuración existente para este modo
    const existente = await ConfiguracionExamen.findOne({
      where: { id_materia, modo },
    });

    const payload = {
      id_materia,
      modo,
      tiempo_limite_min: tiempo_limite_min ?? null,
      intentos_permitidos: intentos_permitidos ?? 1,
    };

    let config;
    let creado = false;

    if (existente) {
      await existente.update(payload);
      config = existente;
    } else {
      config = await ConfiguracionExamen.create(payload);
      creado = true;
    }

    const raw = config.get({ plain: true });
    return {
      creado,
      config: {
        id_config: raw.id_config,
        id_materia: raw.id_materia,
        modo: raw.modo,
        tiempo_limite_min: raw.tiempo_limite_min,
        intentos_permitidos: raw.intentos_permitidos,
      },
    };
  }

  /**
   * Elimina una configuración específica por id_config.
   * Solo admin — no se puede eliminar si hay intentos EN_PROGRESO asociados.
   */
  static async eliminarConfiguracion(id_config) {
    const config = await ConfiguracionExamen.findByPk(id_config);
    if (!config) throw new Error("NO_ENCONTRADO: Configuración no encontrada.");

    // Guard: no eliminar si hay intentos en progreso
    const enProgreso = await Intento.count({
      where: { id_config, estado: "EN_PROGRESO" },
    });
    if (enProgreso > 0) {
      throw new Error(
        `RESTRICCION: No se puede eliminar: ${enProgreso} intento(s) en progreso usan esta configuración.`,
      );
    }

    await config.destroy();
    return { mensaje: "Configuración eliminada correctamente." };
  }

  // ─── Guardar evaluación rápida (TEST mode) ───────────────────────────────────

  /**
   * Guarda los resultados de una evaluación rápida (TEST mode) sin configuración formal.
   * Crea un intento sin id_config y registra las respuestas.
   *
   * NOTA: este método califica respuestas que el frontend ya envió; el orden
   * aleatorio de preguntas/opciones del modo TEST se controla en el momento
   * en que el frontend obtiene las preguntas (no aquí).
   */
  static async guardarEvaluacionRapida(id_usuario, id_materia, respuestasUsuario) {
    if (!Array.isArray(respuestasUsuario)) {
      throw new Error("VALIDACION: El formato de las respuestas es inválido.");
    }

    // Verificar que el usuario está inscrito en la materia
    const inscripcion = await Inscripcion.findOne({
      where: {
        id_usuario,
        id_materia,
        activo: true,
      },
      attributes: ["id_usuario"],
    });
    if (!inscripcion) {
      throw new Error("RESTRICCION: No está inscrito en esta materia.");
    }

    const t = await sequelize.transaction();

    try {
      // Obtener preguntas de la materia para validar respuestas
      const preguntasValidas = await BancoPregunta.findAll({
        where: {
          id_pregunta: [...new Set(respuestasUsuario.map((r) => r.id_pregunta))],
          id_materia,
          activo: true,
        },
        attributes: ["id_pregunta", "tipo_pregunta", "estructura_json"],
        transaction: t,
      });

      const preguntasMap = new Map(preguntasValidas.map((p) => [p.id_pregunta, p]));
      const idsValidos = new Set(preguntasValidas.map((p) => p.id_pregunta));

      // Validar que todas las preguntas respondidas pertenecen a la materia
      for (const r of respuestasUsuario) {
        if (!idsValidos.has(r.id_pregunta)) {
          throw new Error(
            `VALIDACION: La pregunta ${r.id_pregunta} no pertenece a esta materia.`,
          );
        }
      }

      // Cargar opciones de las preguntas
      const opcionesDB = await OpcionRespuesta.findAll({
        where: { id_pregunta: [...idsValidos] },
        transaction: t,
      });

      const opcionesPorId = new Map();
      const opcionesPorPregunta = new Map();
      for (const op of opcionesDB) {
        const plain = op.get({ plain: true });
        opcionesPorId.set(plain.id_opcion, plain);
        if (!opcionesPorPregunta.has(plain.id_pregunta)) {
          opcionesPorPregunta.set(plain.id_pregunta, []);
        }
        opcionesPorPregunta.get(plain.id_pregunta).push(plain);
      }

      // Buscar o crear una configuración de modo TEST para esta materia
      let config = await ConfiguracionExamen.findOne({
        where: { id_materia, modo: "TEST" },
        transaction: t,
      });

      if (!config) {
        config = await ConfiguracionExamen.create(
          {
            id_materia,
            modo: "TEST",
            intentos_permitidos: 999,
            tiempo_limite_min: null,
          },
          { transaction: t },
        );
      }

      // Crear intento con el id_config encontrado o creado
      const ahora = new Date();
      const intento = await Intento.create(
        {
          id_usuario,
          id_config: config.id_config,
          fecha_inicio: ahora,
          fecha_fin: ahora,
          estado: "FINALIZADO",
          nota_final: 0, // Se recalculará
        },
        { transaction: t },
      );

      // Calificar respuestas
      let totalCorrectas = 0;
      const detallesAInsertar = [];

      for (const respuesta of respuestasUsuario) {
        const pDb = preguntasMap.get(respuesta.id_pregunta);
        const tipo = pDb?.tipo_pregunta;
        const estructura = pDb?.estructura_json;

        if (tipo === "SELECCION_MULTIPLE") {
          const opcionesPregunta = opcionesPorPregunta.get(respuesta.id_pregunta) || [];
          const correctasIds = opcionesPregunta.filter((o) => o.es_correcta).map((o) => o.id_opcion);
          
          const raw = respuesta.respuesta_json;
          const elegidasIds = Array.isArray(raw) ? raw : (raw?.opciones_ids || []);

          const esCorrecta = elegidasIds.length === correctasIds.length && elegidasIds.every((id) => correctasIds.includes(id));
          const puntos = esCorrecta ? 1.0 : 0.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento: intento.id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { opciones_ids: elegidasIds },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else if (tipo === "ORDENAR") {
          const correctOrder = estructura?.respuesta?.orden_ids || [];
          const raw = respuesta.respuesta_json;
          const userOrder = Array.isArray(raw) ? raw : (raw?.orden_ids || []);
          
          let hits = 0;
          for (let i = 0; i < correctOrder.length; i++) {
            if (String(userOrder[i]) === String(correctOrder[i])) hits++;
          }
          
          const puntos = correctOrder.length ? hits / correctOrder.length : 0;
          const esCorrecta = puntos === 1.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento: intento.id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { orden_ids: userOrder },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else if (tipo === "COMPLETAR") {
          const aceptadasArr = estructura?.respuesta?.aceptadas || [];
          const raw = respuesta.respuesta_json;
          const userSlots = Array.isArray(raw?.espacios) ? raw.espacios : (Array.isArray(raw) ? raw : []);
          
          const userMap = new Map();
          userSlots.forEach(s => {
            userMap.set(String(s.espacio_id), String(s.respuesta || "").trim().toLowerCase());
          });

          let hits = 0;
          for (const config of aceptadasArr) {
            const userVal = userMap.get(String(config.espacio_id));
            const possibleVals = (config.valores || []).map(v => String(v).trim().toLowerCase());
            if (userVal && possibleVals.includes(userVal)) {
              hits++;
            }
          }

          const puntos = aceptadasArr.length ? hits / aceptadasArr.length : 0;
          const esCorrecta = puntos === 1.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento: intento.id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: null,
            respuesta_json: { espacios: userSlots },
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        } else {
          const opcion = opcionesPorId.get(respuesta.id_opcion);

          if (!opcion) {
            throw new Error(
              `VALIDACION: La opción ${respuesta.id_opcion} no existe en el sistema.`,
            );
          }
          if (opcion.id_pregunta !== respuesta.id_pregunta) {
            throw new Error(
              `VALIDACION: La opción ${respuesta.id_opcion} no corresponde a la pregunta ${respuesta.id_pregunta}.`,
            );
          }

          const esCorrecta = opcion.es_correcta === true;
          const puntos = esCorrecta ? 1.0 : 0.0;
          if (esCorrecta) totalCorrectas++;

          detallesAInsertar.push({
            id_intento: intento.id_intento,
            id_pregunta: respuesta.id_pregunta,
            id_opcion_elegida: respuesta.id_opcion,
            es_correcta_snapshot: esCorrecta,
            puntos_obtenidos: puntos,
          });
        }
      }

      // Insertar detalles
      await DetalleIntento.bulkCreate(detallesAInsertar, { transaction: t });

      // Calcular nota final
      const totalRespondidas = detallesAInsertar.length;
      const notaFinal =
        totalRespondidas > 0
          ? parseFloat(((totalCorrectas / totalRespondidas) * 10).toFixed(2))
          : 0;

      // Actualizar intento con nota final
      await intento.update(
        { nota_final: notaFinal },
        { transaction: t },
      );

      await t.commit();

      return {
        id_intento: intento.id_intento,
        estado: "FINALIZADO",
        nota_final: notaFinal,
        preguntas_correctas: totalCorrectas,
        total_preguntas: totalRespondidas,
        porcentaje: parseFloat(((totalCorrectas / totalRespondidas) * 100).toFixed(2)),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Resetear intentos de un estudiante (Admin) ──────────────────────────────

  /**
   * Marca como ANULADO todos los intentos FINALIZADOS de un estudiante
   * en una configuración específica, sin borrar el historial.
   * El conteo de intentosFinalizados en iniciarExamen filtra solo FINALIZADO,
   * así que los ANULADO no suman y el estudiante recupera sus intentos.
   */
  static async resetearIntentos(id_usuario, id_config) {
    if (!id_usuario || !id_config) {
      throw new Error("VALIDACION: id_usuario e id_config son requeridos.");
    }

    const config = await ConfiguracionExamen.findByPk(id_config, {
      include: [{ model: Materia, attributes: ["nombre"] }],
    });
    if (!config) {
      throw new Error("NO_ENCONTRADO: Configuración no encontrada.");
    }

    const [filas] = await Intento.update(
      { estado: "ANULADO" },
      { where: { id_usuario, id_config, estado: "FINALIZADO" } },
    );

    return {
      intentos_anulados: filas,
      mensaje:
        filas > 0
          ? `Se resetearon ${filas} intento(s). El estudiante puede volver a intentar.`
          : "No había intentos finalizados para resetear.",
    };
  }

  /**
   * Retorna todos los intentos (finalizados y anulados) de un estudiante
   * agrupados por configuración, para que el admin vea el estado actual
   * antes de decidir si resetea.
   */
  static async getIntentosEstudiante(id_usuario) {
    if (!id_usuario) {
      throw new Error("VALIDACION: id_usuario es requerido.");
    }

    const intentos = await Intento.findAll({
      where: {
        id_usuario,
        estado: ["FINALIZADO", "ANULADO"],
      },
      include: [
        {
          model: ConfiguracionExamen,
          as: "configuracion",
          attributes: ["id_config", "modo", "intentos_permitidos"],
          include: [{ model: Materia, attributes: ["id_materia", "nombre"] }],
        },
      ],
      attributes: ["id_intento", "estado", "nota_final", "fecha_fin"],
      order: [["fecha_fin", "DESC"]],
    });

    // Agrupar por id_config
    const grupos = {};
    for (const i of intentos) {
      const plain = i.get({ plain: true });
      const cfg = plain.configuracion;
      if (!cfg) continue;
      const key = cfg.id_config;
      if (!grupos[key]) {
        grupos[key] = {
          id_config: cfg.id_config,
          modo: cfg.modo,
          intentos_permitidos: cfg.intentos_permitidos,
          materia: cfg.Materia?.nombre || cfg.Materium?.nombre || "—",
          intentos: [],
        };
      }
      grupos[key].intentos.push({
        id_intento: plain.id_intento,
        estado: plain.estado,
        nota_final: plain.nota_final,
        fecha_fin: plain.fecha_fin,
      });
    }

    return Object.values(grupos).map((g) => ({
      ...g,
      finalizados: g.intentos.filter((i) => i.estado === "FINALIZADO").length,
      anulados: g.intentos.filter((i) => i.estado === "ANULADO").length,
    }));
  }
}