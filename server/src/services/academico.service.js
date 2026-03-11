import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Materia } from "../models/academico.models/materia.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";

export class AcademicoService {
  // ─── DTOs privados ───────────────────────────────────────────────────────────
  // Filtra campos fantasma en entrada: solo los campos reales del modelo pasan.
  // Previene escrituras silenciosas de campos no permitidos (activo, createdAt, etc.)

  /**
   * DTO de entrada para crear/actualizar BancoPregunta.
   * Nunca permite que el caller controle `activo` ni campos de auditoría.
   */
  static #buildPreguntaDTO(datos) {
    const dto = {};
    if (datos.id_materia !== undefined) dto.id_materia = datos.id_materia;
    if (datos.enunciado !== undefined) dto.enunciado = datos.enunciado;
    if (datos.tipo_pregunta !== undefined)
      dto.tipo_pregunta = datos.tipo_pregunta;
    if (datos.url_imagen !== undefined) dto.url_imagen = datos.url_imagen;
    return dto;
  }

  /**
   * DTO de entrada para crear/actualizar OpcionRespuesta.
   * `es_correcta` se fuerza a booleano para evitar truthy accidentales.
   */
  static #buildOpcionDTO(opcion, id_pregunta) {
    return {
      id_pregunta,
      texto: opcion.texto,
      es_correcta: opcion.es_correcta === true, // coerción estricta
    };
  }

  // ─── Validadores privados ────────────────────────────────────────────────────

  static #validarOpcionesPorTipo(tipo_pregunta, opciones) {
    if (!Array.isArray(opciones) || opciones.length < 2) {
      throw new Error(
        "VALIDACION: Una pregunta debe tener al menos 2 opciones.",
      );
    }

    const correctas = opciones.filter((o) => o.es_correcta === true);

    if (correctas.length === 0) {
      throw new Error(
        "VALIDACION: Debe existir exactamente una opción correcta.",
      );
    }

    if (tipo_pregunta === "VERDADERO_FALSO") {
      if (opciones.length !== 2) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO debe tener exactamente 2 opciones.",
        );
      }
      if (correctas.length !== 1) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO debe tener exactamente 1 opción correcta.",
        );
      }
      return;
    }

    if (tipo_pregunta === "MULTIPLE") {
      if (correctas.length !== 1) {
        throw new Error(
          "VALIDACION: MULTIPLE debe tener exactamente 1 opción correcta.",
        );
      }
      return;
    }

    throw new Error(
      `VALIDACION: Tipo de pregunta no reconocido: '${tipo_pregunta}'.`,
    );
  }

  static async #verificarMateria(id_materia, transaction) {
    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia"],
      transaction,
    });
    if (!materia) {
      throw new Error(
        "NO_ENCONTRADO: La materia asignada no existe en el sistema.",
      );
    }
    return materia;
  }

  static async #contarHistorialPorPregunta(id_pregunta, transaction) {
    return await DetalleIntento.count({
      where: { id_pregunta },
      transaction,
    });
  }

  // ─── DTO de salida ───────────────────────────────────────────────────────────

  /**
   * Construye el DTO de respuesta de una pregunta.
   * @param {object} preguntaDb  - Instancia Sequelize (con .get({ plain:true }))
   * @param {boolean} esAdmin    - Si true, expone es_correcta en cada opción
   */
  static #formatPreguntaDTO(preguntaDb, esAdmin = false) {
    const data = preguntaDb.get({ plain: true });

    return {
      id_pregunta: data.id_pregunta,
      id_materia: data.id_materia,
      enunciado: data.enunciado,
      tipo_pregunta: data.tipo_pregunta,
      url_imagen: data.url_imagen ?? null,
      activo: data.activo,
      createdAt: data.createdAt,
      opciones: Array.isArray(data.opciones)
        ? data.opciones.map((o) => {
            const opcionDTO = {
              id_opcion: o.id_opcion,
              texto: o.texto,
            };

            if (esAdmin) opcionDTO.es_correcta = o.es_correcta;
            return opcionDTO;
          })
        : [],
    };
  }

  // ─── Include helpers ─────────────────────────────────────────────────────────

  static #includeOpciones(esAdmin = false) {
    const atributos = ["id_opcion", "texto"];
    if (esAdmin) atributos.push("es_correcta");

    return [
      {
        model: OpcionRespuesta,
        as: "opciones",
        attributes: atributos,
      },
    ];
  }

  // ─── Crear ──────────────────────────────────────────────────────────────────

  static async crearPreguntaConOpciones(datosPregunta, opciones) {
    AcademicoService.#validarOpcionesPorTipo(
      datosPregunta.tipo_pregunta,
      opciones,
    );

    const dto = AcademicoService.#buildPreguntaDTO(datosPregunta);

    if (!dto.id_materia) {
      throw new Error("VALIDACION: El id_materia es obligatorio.");
    }
    if (!dto.enunciado || dto.enunciado.trim() === "") {
      throw new Error("VALIDACION: El enunciado es obligatorio.");
    }
    if (!dto.tipo_pregunta) {
      throw new Error("VALIDACION: El tipo_pregunta es obligatorio.");
    }

    const t = await sequelize.transaction();

    try {
      await AcademicoService.#verificarMateria(dto.id_materia, t);

      const pregunta = await BancoPregunta.create(dto, { transaction: t });

      const opcionesAInsertar = opciones.map((opcion) =>
        AcademicoService.#buildOpcionDTO(opcion, pregunta.id_pregunta),
      );

      const opcionesCreadas = await OpcionRespuesta.bulkCreate(
        opcionesAInsertar,
        {
          transaction: t,
          returning: true, // PostgreSQL: retorna los registros insertados
        },
      );

      await t.commit();

      // DTO de salida manual post-create (sin segundo query a BD)
      return {
        id_pregunta: pregunta.id_pregunta,
        id_materia: pregunta.id_materia,
        enunciado: pregunta.enunciado,
        tipo_pregunta: pregunta.tipo_pregunta,
        url_imagen: pregunta.url_imagen ?? null,
        activo: pregunta.activo,
        createdAt: pregunta.createdAt,
        opciones: opcionesCreadas.map((o) => ({
          id_opcion: o.id_opcion,
          texto: o.texto,
          es_correcta: o.es_correcta,
        })),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Listar por materia ──────────────────────────────────────────────────────

  static async obtenerPreguntasPorMateria(
    id_materia,
    soloActivas = true,
    esAdmin = false,
  ) {
    if (!id_materia) {
      throw new Error("VALIDACION: El ID de la materia es requerido.");
    }

    // Verifica existencia antes de consultar — evita array vacío ambiguo
    await AcademicoService.#verificarMateria(id_materia, null);

    const where = { id_materia };
    if (soloActivas) where.activo = true;

    const preguntasDb = await BancoPregunta.findAll({
      where,
      include: AcademicoService.#includeOpciones(esAdmin),
      order: [["createdAt", "DESC"]],
    });

    return preguntasDb.map((p) =>
      AcademicoService.#formatPreguntaDTO(p, esAdmin),
    );
  }

  // ─── Obtener por ID ──────────────────────────────────────────────────────────

  /**
   * Retorna una pregunta específica con sus opciones.
   * - soloActivas: true → solo si activo = true (alumnos)
   * - esAdmin: controla visibilidad de es_correcta
   */
  static async obtenerPreguntaPorId(
    id_pregunta,
    soloActivas = true,
    esAdmin = false,
  ) {
    const where = { id_pregunta };
    if (soloActivas) where.activo = true;

    const preguntaDb = await BancoPregunta.findOne({
      where,
      include: AcademicoService.#includeOpciones(esAdmin),
    });

    if (!preguntaDb) {
      throw new Error(
        soloActivas
          ? "NO_ENCONTRADO: La pregunta no existe o está inactiva."
          : "NO_ENCONTRADO: La pregunta no existe.",
      );
    }

    return AcademicoService.#formatPreguntaDTO(preguntaDb, esAdmin);
  }

  // ─── Actualizar ──────────────────────────────────────────────────────────────

  /**
   * Actualiza campos de una pregunta y/o reemplaza sus opciones.
   *
   * Reglas de negocio:
   * 1. Si se envían nuevasOpciones, se validan contra el tipo FINAL de la pregunta.
   * 2. Si la pregunta tiene historial en DetalleIntento, no se permite
   *    modificar opciones (blindaje de integridad histórica).
   * 3. Orden de operación: primero padre (BancoPregunta), luego hijos (OpcionRespuesta).
   * 4. DTO filtra campos fantasma — activo solo cambia vía eliminarPregunta.
   */
  static async actualizarPregunta(id_pregunta, datosPregunta, nuevasOpciones) {
    const dto = AcademicoService.#buildPreguntaDTO(datosPregunta);

    if (
      Object.keys(dto).length === 0 &&
      (!nuevasOpciones || nuevasOpciones.length === 0)
    ) {
      throw new Error(
        "VALIDACION: No se enviaron campos válidos para actualizar.",
      );
    }

    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });
      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      // Si se cambia la materia, verificar que la nueva exista
      if (dto.id_materia && dto.id_materia !== pregunta.id_materia) {
        await AcademicoService.#verificarMateria(dto.id_materia, t);
      }

      // Validación y reemplazo de opciones
      if (nuevasOpciones && nuevasOpciones.length > 0) {
        // Tipo final = el que venga en el DTO o el que ya tiene la pregunta
        const tipoFinal = dto.tipo_pregunta ?? pregunta.tipo_pregunta;
        AcademicoService.#validarOpcionesPorTipo(tipoFinal, nuevasOpciones);

        // Guard de historial: no se pueden cambiar opciones si hay intentos previos
        const historial = await AcademicoService.#contarHistorialPorPregunta(
          id_pregunta,
          t,
        );

        if (historial > 0) {
          throw new Error(
            `RESTRICCION: No se pueden modificar las opciones porque ${historial} respuesta(s) de estudiantes ya referencian esta pregunta. Desactive esta pregunta y cree una nueva versión.`,
          );
        }

        // Orden correcto: primero padre, luego destruir y recrear hijos
        if (Object.keys(dto).length > 0) {
          await pregunta.update(dto, { transaction: t });
        }

        await OpcionRespuesta.destroy({
          where: { id_pregunta },
          transaction: t,
        });

        const opcionesAInsertar = nuevasOpciones.map((opcion) =>
          AcademicoService.#buildOpcionDTO(opcion, id_pregunta),
        );

        await OpcionRespuesta.bulkCreate(opcionesAInsertar, {
          transaction: t,
          returning: true,
        });
      } else if (Object.keys(dto).length > 0) {
        // Solo actualizar campos de la pregunta, sin tocar opciones
        await pregunta.update(dto, { transaction: t });
      }

      await t.commit();

      // Segundo query para retornar el estado real post-actualización
      return await AcademicoService.obtenerPreguntaPorId(
        id_pregunta,
        false,
        true,
      );
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Eliminar (Soft Delete) ──────────────────────────────────────────────────

  /**
   * Desactiva una pregunta (activo = false).
   * - Dentro de transacción para consistencia entre el count y el save.
   * - Incluye advertencia informativa si tiene historial (no bloquea).
   * - Una pregunta inactiva no aparece para alumnos pero preserva estadísticas.
   */
  static async eliminarPregunta(id_pregunta) {
    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      if (!pregunta.activo) {
        throw new Error("VALIDACION: La pregunta ya se encuentra inactiva.");
      }

      // Conteo de historial dentro de la transacción — consistente con el save
      const historial = await AcademicoService.#contarHistorialPorPregunta(
        id_pregunta,
        t,
      );

      pregunta.activo = false;
      await pregunta.save({ transaction: t });

      await t.commit();

      return {
        mensaje: "Pregunta desactivada y oculta del banco correctamente.",
        advertencia:
          historial > 0
            ? `Esta pregunta tiene ${historial} respuesta(s) registrada(s) en intentos previos. Sus estadísticas históricas se mantienen intactas.`
            : null,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Reactivar ───────────────────────────────────────────────────────────────

  /**
   * Reactiva una pregunta previamente desactivada.
   * Operación simétrica a eliminarPregunta.
   */
  static async reactivarPregunta(id_pregunta) {
    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      if (pregunta.activo) {
        throw new Error("VALIDACION: La pregunta ya se encuentra activa.");
      }

      pregunta.activo = true;
      await pregunta.save({ transaction: t });

      await t.commit();

      return { mensaje: "Pregunta reactivada en el banco correctamente." };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Carga masiva desde Excel ────────────────────────────────────────────────

  /**
   * Inserta múltiples preguntas en una sola transacción.
   * Cada item del array tiene el mismo formato que crearPreguntaConOpciones.
   *
   * Estrategia de duplicados:
   *   - El frontend detecta duplicados (enunciado idéntico en la misma materia)
   *     y envía forzarDuplicados=true si el usuario acepta sobreescribir.
   *   - Si forzarDuplicados=false y hay duplicados → error con lista de coincidencias.
   *
   * Resultado: { insertadas, omitidas, errores[] }
   *   - insertadas: cantidad creada exitosamente
   *   - omitidas:   duplicadas omitidas (cuando forzarDuplicados=false y hay match)
   *   - errores:    [{ fila, enunciado, motivo }] — filas con datos inválidos
   */
  static async crearPreguntasBulk(
    id_materia,
    preguntas,
    forzarDuplicados = false,
  ) {
    if (!id_materia) throw new Error("VALIDACION: El id_materia es requerido.");
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      throw new Error("VALIDACION: Debe enviar al menos una pregunta.");
    }
    if (preguntas.length > 200) {
      throw new Error("VALIDACION: Máximo 200 preguntas por carga.");
    }

    // Verificar materia
    await AcademicoService.#verificarMateria(id_materia, null);

    // Cargar enunciados existentes para detectar duplicados — 1 query
    const existentes = await BancoPregunta.findAll({
      where: { id_materia },
      attributes: ["enunciado"],
    });
    const enunciadosExistentes = new Set(
      existentes.map((p) => p.enunciado.trim().toLowerCase()),
    );

    // Clasificar preguntas
    const aInsertar = [];
    const omitidas = [];
    const errores = [];

    preguntas.forEach((item, idx) => {
      const fila = idx + 2; // fila Excel (1=cabecera, datos desde 2)

      // Validar estructura mínima
      if (!item.enunciado?.trim()) {
        errores.push({
          fila,
          enunciado: item.enunciado || "(vacío)",
          motivo: "Enunciado vacío.",
        });
        return;
      }
      if (
        !item.tipo_pregunta ||
        !["MULTIPLE", "VERDADERO_FALSO"].includes(item.tipo_pregunta)
      ) {
        errores.push({
          fila,
          enunciado: item.enunciado,
          motivo: "Tipo de pregunta inválido.",
        });
        return;
      }
      try {
        AcademicoService.#validarOpcionesPorTipo(
          item.tipo_pregunta,
          item.opciones || [],
        );
      } catch (e) {
        errores.push({
          fila,
          enunciado: item.enunciado,
          motivo: e.message.replace("VALIDACION: ", ""),
        });
        return;
      }

      // Detectar duplicado
      const clave = item.enunciado.trim().toLowerCase();
      if (enunciadosExistentes.has(clave)) {
        if (!forzarDuplicados) {
          omitidas.push({ fila, enunciado: item.enunciado });
          return;
        }
        // forzarDuplicados=true → se inserta igual (nueva versión)
      }

      aInsertar.push({ ...item, id_materia });
    });

    // Si hay omitidas y no estamos forzando → devolver resumen sin insertar
    if (omitidas.length > 0 && !forzarDuplicados) {
      return { insertadas: 0, omitidas, errores, requiereConfirmacion: true };
    }

    if (aInsertar.length === 0) {
      return { insertadas: 0, omitidas, errores, requiereConfirmacion: false };
    }

    // Inserción masiva en transacción única
    const t = await sequelize.transaction();
    let insertadas = 0;

    try {
      for (const item of aInsertar) {
        const pregunta = await BancoPregunta.create(
          AcademicoService.#buildPreguntaDTO(item),
          { transaction: t },
        );

        const opcionesDTO = item.opciones.map((o) =>
          AcademicoService.#buildOpcionDTO(o, pregunta.id_pregunta),
        );

        await OpcionRespuesta.bulkCreate(opcionesDTO, {
          transaction: t,
          returning: false,
        });

        insertadas++;
      }

      await t.commit();
      return { insertadas, omitidas: [], errores, requiereConfirmacion: false };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
