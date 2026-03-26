import { AcademicoService } from "../services/academico.service.js";

export class AcademicoController {
  static #extraerCodigoDetalle(msg = "") {
    const match = String(msg).match(/^(VALIDACION|ESTADO_INVALIDO|RESTRICCION|NO_ENCONTRADO):\s*([A-Z0-9_]+):\s*(.*)$/);
    if (!match) return null;
    return { prefijo: match[1], codigo: match[2], detalle: match[3] };
  }

  static #manejarError(res, error, mensajeServidor) {
    console.error("[AcademicoController]:", error.message);
    const msg = error.message;
    const detalleError = AcademicoController.#extraerCodigoDetalle(msg);

    if (detalleError?.codigo?.startsWith("COMPLETAR_")) {
      console.info("[completar.validation.error]", {
        pregunta_id: null,
        modo_interaccion: null,
        codigo_error: detalleError.codigo,
        actor: "autor",
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
    if (msg.startsWith("RESTRICCION") || msg.startsWith("DUPLICADO")) {
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

  static #parsearSoloActivas(req) {
    const esAdmin = req.user?.rol === "ADMINISTRADOR";
    if (!esAdmin) return true;
    return req.query.activas !== "false";
  }

  static async crearPregunta(req, res) {
    try {
      const { id_materia, enunciado, url_imagen, tipo_pregunta, estructura_json } =
        req.body;

      if (!id_materia || !enunciado || !tipo_pregunta) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: Faltan campos requeridos (id_materia, enunciado, tipo_pregunta).",
        });
      }

      if (!estructura_json || typeof estructura_json !== "object") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El campo 'estructura_json' es requerido.",
        });
      }

      const resultado = await AcademicoService.crearPregunta({
        id_materia,
        enunciado,
        url_imagen,
        tipo_pregunta,
        estructura_json,
      });

      return res.status(201).json({
        ok: true,
        mensaje: "Pregunta creada exitosamente.",
        data: resultado,
      });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error interno al crear la pregunta.",
      );
    }
  }

  static async obtenerPreguntas(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      const esAdmin = req.user?.rol === "ADMINISTRADOR";
      const soloActivas = AcademicoController.#parsearSoloActivas(req);

      const preguntas = await AcademicoService.obtenerPreguntasPorMateria(
        id,
        soloActivas,
        esAdmin,
      );

      return res.status(200).json({ ok: true, data: preguntas });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al obtener las preguntas.",
      );
    }
  }

  static async obtenerPreguntasTest(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      const preguntas = await AcademicoService.obtenerPreguntasPorMateria(
        id,
        true,
        true,
      );

      return res.status(200).json({ ok: true, data: preguntas });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al obtener las preguntas para modo test.",
      );
    }
  }

  static async obtenerPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const esAdmin = req.user?.rol === "ADMINISTRADOR";
      const soloActivas = AcademicoController.#parsearSoloActivas(req);

      const pregunta = await AcademicoService.obtenerPreguntaPorId(
        id,
        soloActivas,
        esAdmin,
      );

      return res.status(200).json({ ok: true, data: pregunta });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al obtener la pregunta.",
      );
    }
  }

  static async actualizarPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const { enunciado, url_imagen, tipo_pregunta, estructura_json } = req.body;

      const datosPregunta = {};
      if (enunciado !== undefined) datosPregunta.enunciado = enunciado;
      if (url_imagen !== undefined) datosPregunta.url_imagen = url_imagen;
      if (tipo_pregunta !== undefined)
        datosPregunta.tipo_pregunta = tipo_pregunta;
      if (estructura_json !== undefined) datosPregunta.estructura_json = estructura_json;

      const resultado = await AcademicoService.actualizarPregunta(id, datosPregunta);

      return res.status(200).json({
        ok: true,
        mensaje: "Pregunta actualizada correctamente.",
        data: resultado,
      });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al actualizar la pregunta.",
      );
    }
  }

  static async desactivarPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const resultado = await AcademicoService.desactivarPregunta(id);

      return res.status(200).json({
        ok: true,
        mensaje: resultado.mensaje,
        advertencia: resultado.advertencia ?? null,
      });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al desactivar la pregunta.",
      );
    }
  }

  static async activarPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const resultado = await AcademicoService.activarPregunta(id);

      return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al activar la pregunta.",
      );
    }
  }

  static async eliminarPreguntaFisica(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const resultado = await AcademicoService.eliminarPreguntaFisica(id);

      return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al eliminar físicamente la pregunta.",
      );
    }
  }

  // Compat legacy: DELETE /preguntas/:id (desactivar)
  static async eliminarPregunta(req, res) {
    return AcademicoController.desactivarPregunta(req, res);
  }

  // Compat legacy: PATCH /preguntas/:id/reactivar
  static async reactivarPregunta(req, res) {
    return AcademicoController.activarPregunta(req, res);
  }

  static async crearPreguntasBulk(req, res) {
    try {
      const { id_materia, preguntas, forzarDuplicados } = req.body;

      const id = AcademicoController.#parsearId(id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El id_materia es requerido y debe ser un entero positivo.",
        });
      }

      if (!Array.isArray(preguntas) || preguntas.length === 0) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El campo 'preguntas' debe ser un arreglo no vacío.",
        });
      }

      const resultado = await AcademicoService.crearPreguntasBulk(
        id,
        preguntas,
        forzarDuplicados === true,
      );

      const status = resultado.errores?.length > 0 ? 207 : 200;

      return res.status(status).json({
        ok: true,
        data: resultado,
      });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error en la carga masiva de preguntas.",
      );
    }
  }
}
