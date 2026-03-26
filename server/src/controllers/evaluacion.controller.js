import { EvaluacionService } from "../services/evaluacion.service.js";

export class EvaluacionController {
  static #extraerCodigoDetalle(msg = "") {
    const match = String(msg).match(/^(VALIDACION|ESTADO_INVALIDO|RESTRICCION|NO_ENCONTRADO):\s*([A-Z0-9_]+):\s*(.*)$/);
    if (!match) return null;
    return { prefijo: match[1], codigo: match[2], detalle: match[3] };
  }

  static #manejarError(res, error, mensajeServidor) {
    console.error("[EvaluacionController]:", error.message);
    const msg = error.message;
    const detalleError = EvaluacionController.#extraerCodigoDetalle(msg);

    if (detalleError?.codigo?.startsWith("COMPLETAR_")) {
      console.info("[completar.validation.error]", {
        pregunta_id: null,
        modo_interaccion: null,
        codigo_error: detalleError.codigo,
        actor: "runtime",
      });
    }

    if (msg.startsWith("VALIDACION") || msg.startsWith("ESTADO_INVALIDO")) {
      return res.status(400).json({
        ok: false,
        error: msg,
        ...(detalleError ? { codigo: detalleError.codigo, mensaje: detalleError.detalle } : {}),
      });
    }
    if (msg.startsWith("NO_ENCONTRADO")) {
      return res.status(404).json({
        ok: false,
        error: msg,
        ...(detalleError ? { codigo: detalleError.codigo, mensaje: detalleError.detalle } : {}),
      });
    }
    if (msg.startsWith("RESTRICCION")) {
      return res.status(409).json({
        ok: false,
        error: msg,
        ...(detalleError ? { codigo: detalleError.codigo, mensaje: detalleError.detalle } : {}),
      });
    }

    return res.status(500).json({ ok: false, error: mensajeServidor });
  }

  static #parsearId(valor) {
    const id = parseInt(valor, 10);
    return isNaN(id) || id <= 0 ? null : id;
  }

  static #parsearEnteroOpcional(valor) {
    if (valor === undefined) return undefined;
    if (valor === null) return null;
    if (typeof valor === "string" && valor.trim() === "") return null;

    const numero = Number(valor);
    if (!Number.isInteger(numero)) return Number.NaN;
    return numero;
  }

  static #parsearBooleano(valor) {
    if (typeof valor === "boolean") return valor;
    if (typeof valor === "number") return valor === 1;
    if (typeof valor === "string") {
      const normalizado = valor.trim().toLowerCase();
      return ["true", "1", "si", "sí"].includes(normalizado);
    }
    return false;
  }

  static #validarEstructuraRespuestas(respuestas) {
    if (!Array.isArray(respuestas)) {
      return "VALIDACION: Se requiere un arreglo de respuestas.";
    }

    for (let i = 0; i < respuestas.length; i++) {
      const r = respuestas[i];

      if (!r || typeof r !== "object") {
        return `VALIDACION: La respuesta en posición ${i} no es un objeto válido.`;
      }

      const idPregunta = parseInt(r.id_pregunta, 10);

      if (isNaN(idPregunta) || idPregunta <= 0) {
        return `VALIDACION: La respuesta en posición ${i} tiene un id_pregunta inválido.`;
      }

      const tieneIdOpcion = r.id_opcion !== undefined && r.id_opcion !== null;
      const tieneRespuestaJson =
        r.respuesta_json !== undefined && r.respuesta_json !== null;

      if (!tieneIdOpcion && !tieneRespuestaJson) {
        return `VALIDACION: La respuesta en posición ${i} debe incluir id_opcion o respuesta_json.`;
      }

      if (tieneIdOpcion) {
        const idOpcion = parseInt(r.id_opcion, 10);
        if (isNaN(idOpcion) || idOpcion <= 0) {
          return `VALIDACION: La respuesta en posición ${i} tiene un id_opcion inválido.`;
        }
      }

      if (tieneRespuestaJson && typeof r.respuesta_json !== "object") {
        return `VALIDACION: La respuesta en posición ${i} tiene un respuesta_json inválido.`;
      }
    }

    return null;
  }

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

      const reiniciar = EvaluacionController.#parsearBooleano(req.body?.reiniciar);

      const resultado = await EvaluacionService.iniciarExamen(
        id_usuario,
        id_configuracion,
        reiniciar,
      );

      return res.status(201).json({
        ok: true,
        mensaje: resultado.intento_reutilizado
          ? "Examen en progreso recuperado correctamente."
          : reiniciar
            ? "Examen reiniciado correctamente."
            : "Examen iniciado correctamente.",
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

  static async guardarProgresoExamen(req, res) {
    try {
      const id_usuario = req.user.id;
      const id_intento = EvaluacionController.#parsearId(req.params.id_intento);

      if (!id_intento) {
        return res
          .status(400)
          .json({ ok: false, error: "VALIDACION: id_intento inválido." });
      }

      const progreso = req.body?.progreso;
      if (!progreso || typeof progreso !== "object") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: Se requiere un objeto progreso.",
        });
      }

      const data = await EvaluacionService.guardarProgresoExamen(
        id_intento,
        id_usuario,
        progreso,
      );

      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return EvaluacionController.#manejarError(
        res,
        error,
        "Error al guardar progreso del examen.",
      );
    }
  }

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
          modo: String(modo).toUpperCase(),
          tiempo_limite_min:
            EvaluacionController.#parsearEnteroOpcional(tiempo_limite_min),
          intentos_permitidos:
            EvaluacionController.#parsearEnteroOpcional(intentos_permitidos),
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
