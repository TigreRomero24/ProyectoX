import { AcademicoService } from "../services/academico.service.js";

export class AcademicoController {
  //Manejador de errores, en un futuro sera actualizado por errorMildeware

  static #manejarError(res, error, mensajeServidor) {
    console.error("[AcademicoController]:", error.message);
    const msg = error.message;

    if (msg.startsWith("VALIDACION") || msg.startsWith("ESTADO_INVALIDO")) {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg.startsWith("NO_ENCONTRADO")) {
      return res.status(404).json({ ok: false, error: msg });
    }
    if (msg.startsWith("RESTRICCION") || msg.startsWith("DUPLICADO")) {
      return res.status(409).json({ ok: false, error: msg });
    }

    return res.status(500).json({ ok: false, error: mensajeServidor });
  }

  static #parsearId(valor) {
    const id = parseInt(valor, 10);
    return isNaN(id) || id <= 0 ? null : id;
  }

  /**
   * Deriva el flag soloActivas desde query params según el rol del usuario.
   */
  static #parsearSoloActivas(req) {
    const esAdmin = req.user?.rol === "ADMINISTRADOR";
    if (!esAdmin) return true;
    return req.query.activas !== "false";
  }

  // ─── Preguntas ───────────────────────────────────────────────────────────────
  static async crearPregunta(req, res) {
    try {
      const { id_materia, enunciado, url_imagen, tipo_pregunta, opciones } =
        req.body;

      if (!id_materia || !enunciado || !tipo_pregunta) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: Faltan campos requeridos (id_materia, enunciado, tipo_pregunta).",
        });
      }

      if (!Array.isArray(opciones) || opciones.length === 0) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El campo 'opciones' es requerido y debe ser un arreglo no vacío.",
        });
      }

      const resultado = await AcademicoService.crearPreguntaConOpciones(
        { id_materia, enunciado, url_imagen, tipo_pregunta },
        opciones,
      );

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

  /**
   * GET /academico/preguntas/materia/:id_materia
   * Lista preguntas de una materia.
   * - Alumno: solo activas, sin es_correcta.
   * - Admin: todas (?activas=false), con es_correcta.
   */
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

  /**
   * GET /academico/preguntas/materia/:id_materia/test
   * Preguntas para Modo TEST — incluye es_correcta para feedback inmediato.
   * Solo usuarios autenticados (cualquier rol).

   */
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

  /**
   * GET /academico/preguntas/:id_pregunta
   * Detalle de una pregunta específica.
   */
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

  /**
   * PUT /academico/preguntas/:id_pregunta
   * Actualiza campos y/o opciones de una pregunta existente.
   * Bloqueado si la pregunta tiene historial de respuestas en DetalleIntento.
   * Solo ADMINISTRADOR (protegido en routes).
   */
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

      const { enunciado, url_imagen, tipo_pregunta, opciones } = req.body;

      if (opciones !== undefined && !Array.isArray(opciones)) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El campo 'opciones' debe ser un arreglo.",
        });
      }

      const datosPregunta = {};
      if (enunciado !== undefined) datosPregunta.enunciado = enunciado;
      if (url_imagen !== undefined) datosPregunta.url_imagen = url_imagen;
      if (tipo_pregunta !== undefined)
        datosPregunta.tipo_pregunta = tipo_pregunta;

      const resultado = await AcademicoService.actualizarPregunta(
        id,
        datosPregunta,
        opciones ?? [],
      );

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

  /**
   * DELETE /academico/preguntas/:id_pregunta

   */
  static async eliminarPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const resultado = await AcademicoService.eliminarPregunta(id);

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

  /**
   * PATCH /academico/preguntas/:id_pregunta/reactivar

   */
  static async reactivarPregunta(req, res) {
    try {
      const id = AcademicoController.#parsearId(req.params.id_pregunta);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la pregunta debe ser un número entero positivo.",
        });
      }

      const resultado = await AcademicoService.reactivarPregunta(id);

      return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
    } catch (error) {
      return AcademicoController.#manejarError(
        res,
        error,
        "Error al reactivar la pregunta.",
      );
    }
  }

  /**
   * POST /academico/preguntas/bulk
   * Carga masiva de preguntas desde Excel (parseado en el frontend).
   */
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
