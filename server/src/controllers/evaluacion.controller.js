import { EvaluacionService } from "../services/evaluacion.service.js";

export class EvaluacionController {
  static #manejarError(res, error, mensajeServidor) {
    console.error("[EvaluacionController]:", error.message);
    const msg = error.message;

    if (msg.startsWith("VALIDACION") || msg.startsWith("ESTADO_INVALIDO")) {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg.startsWith("NO_ENCONTRADO")) {
      return res.status(404).json({ ok: false, error: msg });
    }
    if (msg.startsWith("RESTRICCION")) {
      return res.status(409).json({ ok: false, error: msg });
    }

    return res.status(500).json({ ok: false, error: mensajeServidor });
  }

  static #parsearId(valor) {
    const id = parseInt(valor, 10);
    return isNaN(id) || id <= 0 ? null : id;
  }

  /**
   * Valida que cada elemento del arreglo de respuestas tenga
   * la estructura mínima requerida: { id_pregunta, id_opcion }.
   * Retorna el primer error encontrado o null si todo es válido.
   */
  static #validarEstructuraRespuestas(respuestas) {
    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return "VALIDACION: Se requiere un arreglo no vacío de respuestas.";
    }

    for (let i = 0; i < respuestas.length; i++) {
      const r = respuestas[i];

      if (!r || typeof r !== "object") {
        return `VALIDACION: La respuesta en posición ${i} no es un objeto válido.`;
      }

      const idPregunta = parseInt(r.id_pregunta, 10);
      const idOpcion = parseInt(r.id_opcion, 10);

      if (isNaN(idPregunta) || idPregunta <= 0) {
        return `VALIDACION: La respuesta en posición ${i} tiene un id_pregunta inválido.`;
      }
      if (isNaN(idOpcion) || idOpcion <= 0) {
        return `VALIDACION: La respuesta en posición ${i} tiene un id_opcion inválido.`;
      }
    }

    return null;
  }

  // ─── Endpoints ───────────────────────────────────────────────────────────────

  /**
   * POST /evaluaciones/iniciar
   * Inicia un nuevo intento de examen para el estudiante autenticado.
   * Valida inscripción, límite de intentos y que no haya uno en progreso.
   */
  static async iniciarExamen(req, res) {
    try {
      const id_usuario = req.user.id;

      const id_configuracion = EvaluacionController.#parsearId(
        req.body.id_configuracion,
      );

      if (!id_configuracion) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El id_configuracion es requerido y debe ser un número entero positivo.",
        });
      }

      const resultado = await EvaluacionService.iniciarExamen(
        id_usuario,
        id_configuracion,
      );

      return res.status(201).json({
        ok: true,
        mensaje: "Examen iniciado correctamente.",
        data: resultado,
      });
    } catch (error) {
      if (error.message === "INTENTO_EN_PROGRESO") {
        return res.status(409).json({
          ok: false,
          codigo: "INTENTO_EN_PROGRESO",
          mensaje: "Ya tiene un examen en progreso.",
          id_intento: error.id_intento,
        });
      }
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error interno al iniciar el examen.",
      );
    }
  }

  /**
   * GET /evaluaciones/retomar/:id_intento
   * Carga un intento EN_PROGRESO con preguntas y opciones para continuar.
   */
  static async retomarExamen(req, res) {
    try {
      const id_usuario = req.user.id;
      const id_intento = EvaluacionController.#parsearId(req.params.id_intento);
      if (!id_intento) {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDACION: id_intento inválido." });
      }
      const data = await EvaluacionService.retomarExamen(
        id_intento,
        id_usuario,
      );
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al retomar el examen.",
      );
    }
  }

  static async enviarExamen(req, res) {
    try {
      const id_usuario = req.user.id;

      const id_intento = EvaluacionController.#parsearId(req.params.id_intento);

      if (!id_intento) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID del intento debe ser un número entero positivo.",
        });
      }

      const { respuestas } = req.body;

      const errorRespuestas =
        EvaluacionController.#validarEstructuraRespuestas(respuestas);
      if (errorRespuestas) {
        return res.status(400).json({ ok: false, error: errorRespuestas });
      }

      const resultado = await EvaluacionService.enviarExamen(
        id_intento,
        id_usuario,
        respuestas,
      );

      return res.status(200).json({
        ok: true,
        mensaje: "Examen enviado y calificado correctamente.",
        data: resultado,
      });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error interno al procesar el examen.",
      );
    }
  }

  /**
   * GET /evaluaciones/intentos/:id_intento
   * Obtiene el detalle completo de un intento (retroalimentación post-examen).
   */
  static async obtenerIntento(req, res) {
    try {
      const id_usuario = req.user.id;

      const id_intento = EvaluacionController.#parsearId(req.params.id_intento);

      if (!id_intento) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID del intento debe ser un número entero positivo.",
        });
      }

      const intento = await EvaluacionService.obtenerIntento(
        id_intento,
        id_usuario,
      );

      return res.status(200).json({ ok: true, data: intento });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al obtener el detalle del examen.",
      );
    }
  }

  /**
   * GET /evaluaciones/historial
   * Retorna todos los intentos FINALIZADOS del estudiante autenticado.
   */
  static async obtenerHistorial(req, res) {
    try {
      const id_usuario = req.user.id;

      const historial = await EvaluacionService.obtenerHistorial(id_usuario);

      return res.status(200).json({ ok: true, data: historial });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al obtener el historial de evaluaciones.",
      );
    }
  }

  /**
   * GET /evaluaciones/configuraciones/materia/:id_materia
   * Retorna las configuraciones disponibles (TEST/EXAMEN) para una materia.
   */
  static async obtenerConfiguracionesPorMateria(req, res) {
    try {
      const id = EvaluacionController.#parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      const data = await EvaluacionService.obtenerConfiguracionesPorMateria(id);

      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al obtener las configuraciones de la materia.",
      );
    }
  }

  /**
   * POST /evaluaciones/configuraciones/materia/:id_materia
   * Crea o actualiza la configuración de un modo para una materia (upsert).
   */
  static async upsertConfiguracion(req, res) {
    try {
      const id_materia = EvaluacionController.#parsearId(req.params.id_materia);
      if (!id_materia) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      const { modo, tiempo_limite_min, intentos_permitidos } = req.body;

      if (!modo) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El campo 'modo' es requerido ('TEST' o 'EXAMEN').",
        });
      }

      const resultado = await EvaluacionService.upsertConfiguracion(
        id_materia,
        {
          modo,
          tiempo_limite_min:
            tiempo_limite_min !== undefined
              ? parseInt(tiempo_limite_min, 10) || null
              : undefined,
          intentos_permitidos:
            intentos_permitidos !== undefined
              ? parseInt(intentos_permitidos, 10)
              : undefined,
        },
      );

      return res.status(resultado.creado ? 201 : 200).json({
        ok: true,
        mensaje: resultado.creado
          ? "Configuración creada correctamente."
          : "Configuración actualizada correctamente.",
        data: resultado.config,
      });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al guardar la configuración.",
      );
    }
  }

  /**
   * DELETE /evaluaciones/configuraciones/:id_config
   * Elimina una configuración. Bloqueado si hay intentos EN_PROGRESO.
   */
  static async eliminarConfiguracion(req, res) {
    try {
      const id = EvaluacionController.#parsearId(req.params.id_config);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de configuración debe ser un número entero positivo.",
        });
      }

      const resultado = await EvaluacionService.eliminarConfiguracion(id);

      return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al eliminar la configuración.",
      );
    }
  }
}
