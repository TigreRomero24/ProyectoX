import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { Materia } from "../models/academico.models/materia.js";
import { ConfiguracionExamen } from "../models/evaluacion.models/configuracionExamen.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";

const PREGUNTAS_MODO_TEST = 10;
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

  static #calcularCantidadPreguntas(modo, totalDisponibles) {
    if (modo === "TEST") {
      return Math.min(PREGUNTAS_MODO_TEST, totalDisponibles);
    }
    return totalDisponibles;
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
   * y registra el intento EN_PROGRESO en BD.
   */
  static async iniciarExamen(id_usuario, id_configuracion) {
    // ── Fase 1: Validaciones previas (lecturas sin transacción) ──────────────
    const configuracion = await ConfiguracionExamen.findByPk(id_configuracion);
    if (!configuracion) {
      throw new Error("NO_ENCONTRADO: Configuración de examen no encontrada.");
    }

    const inscripcion = await Inscripcion.findOne({
      where: {
        id_usuario,
        id_materia: configuracion.id_materia,
        modo_evaluacion: configuracion.modo,
        activo: true,
      },
      attributes: ["id_usuario"],
    });
    if (!inscripcion) {
      throw new Error(
        "RESTRICCION: No está inscrito en esta materia con el modo requerido, o la inscripción está desactivada.",
      );
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
      attributes: ["id_pregunta", "enunciado", "url_imagen", "tipo_pregunta"],
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

    const preguntasSeleccionadas = EvaluacionService.#mezclarYCortar(
      preguntasDisponibles,
      cantidad,
    );

    const idsPreguntas = preguntasSeleccionadas.map((p) => p.id_pregunta);
    const todasLasOpciones = await OpcionRespuesta.findAll({
      where: { id_pregunta: idsPreguntas },
      attributes: ["id_opcion", "id_pregunta", "texto"],
    });

    const opcionesPorPregunta = todasLasOpciones.reduce((acc, opcion) => {
      const raw = opcion.get({ plain: true });
      if (!acc[raw.id_pregunta]) acc[raw.id_pregunta] = [];
      acc[raw.id_pregunta].push({ id_opcion: raw.id_opcion, texto: raw.texto });
      return acc;
    }, {});

    const t = await sequelize.transaction();
    let intento;
    try {
      intento = await Intento.create(
        {
          id_usuario,
          id_config: id_configuracion,
          fecha_inicio: new Date(),
          estado: "EN_PROGRESO",
        },
        { transaction: t },
      );
      await t.commit();
      // FIX CRÍTICO: commit ANTES del DTO — si el map() falla, el intento
      // ya existe en BD y el cliente puede reanudar con obtenerIntento().
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
        attributes: ["id_pregunta"],
        transaction: t,
      });

      const idsValidos = new Set(preguntasValidas.map((p) => p.id_pregunta));

      for (const r of respuestasUsuario) {
        if (!idsValidos.has(r.id_pregunta)) {
          throw new Error(
            `VALIDACION: La pregunta ${r.id_pregunta} no pertenece a este examen.`,
          );
        }
      }

      // ── FIX N+1: Cargar todas las opciones elegidas en 1 sola query ──────────
      const idsOpciones = [
        ...new Set(respuestasUsuario.map((r) => r.id_opcion)),
      ];
      const opcionesElegidas = await OpcionRespuesta.findAll({
        where: { id_opcion: idsOpciones },
        transaction: t,
      });
      const opcionesMap = new Map(
        opcionesElegidas.map((o) => [o.id_opcion, o.get({ plain: true })]),
      );

      // ── Calificar ────────────────────────────────────────────────────────────
      let totalCorrectas = 0;
      const detallesAInsertar = [];

      for (const respuesta of respuestasUsuario) {
        const opcion = opcionesMap.get(respuesta.id_opcion);

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

      // ── FIX N+1: Inserción masiva del historial ──────────────────────────────
      await DetalleIntento.bulkCreate(detallesAInsertar, { transaction: t });

      const totalRespondidas = detallesAInsertar.length;
      const notaFinal =
        totalRespondidas > 0
          ? parseFloat(((totalCorrectas / totalRespondidas) * 10).toFixed(2))
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
        total_preguntas: totalRespondidas,
        porcentaje: parseFloat(
          ((totalCorrectas / totalRespondidas) * 100).toFixed(1),
        ),
        // es_correcta expuesto por decisión de negocio: el alumno ve el resultado completo
        detalle: detallesAInsertar.map(EvaluacionService.#buildDetalleDTO),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Retomar intento en progreso ────────────────────────────────────────────

  /**
   * Carga un intento EN_PROGRESO con todas sus preguntas y opciones
   * para que el estudiante pueda continuar donde lo dejó.
   * Solo accesible por el propietario del intento.
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

    // Cargar todas las preguntas activas de la materia con opciones (sin es_correcta)
    const preguntas = await BancoPregunta.findAll({
      where: { id_materia: configuracion.id_materia, activo: true },
      attributes: ["id_pregunta", "enunciado", "url_imagen", "tipo_pregunta"],
    });

    const idsPreguntas = preguntas.map((p) => p.id_pregunta);
    const opciones = await OpcionRespuesta.findAll({
      where: { id_pregunta: idsPreguntas },
      attributes: ["id_opcion", "id_pregunta", "texto"],
    });

    const opcionesPorPregunta = opciones.reduce((acc, op) => {
      const raw = op.get({ plain: true });
      if (!acc[raw.id_pregunta]) acc[raw.id_pregunta] = [];
      acc[raw.id_pregunta].push({ id_opcion: raw.id_opcion, texto: raw.texto });
      return acc;
    }, {});

    const preguntasConOpciones = preguntas.map((p) => {
      const raw = p.get({ plain: true });
      return {
        id_pregunta: raw.id_pregunta,
        enunciado: raw.enunciado,
        url_imagen: raw.url_imagen ?? null,
        tipo_pregunta: raw.tipo_pregunta,
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
          as: "respuestas_detalle", // ← confirmado en relacionesModel.js
          include: [
            {
              model: BancoPregunta,
              // sin as — asociación definida sin alias en relacionesModel.js
              attributes: ["id_pregunta", "enunciado", "tipo_pregunta"],
            },
          ],
        },
        {
          model: ConfiguracionExamen,
          as: "configuracion", // ← confirmado en relacionesModel.js
          include: [
            {
              model: Materia,
              // sin as — asociación definida sin alias en relacionesModel.js
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
          as: "configuracion", // ← confirmado en relacionesModel.js
          include: [
            {
              model: Materia,
              // sin as — asociación sin alias en relacionesModel.js
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

    return intentos.map((i) => i.get({ plain: true }));
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
}
