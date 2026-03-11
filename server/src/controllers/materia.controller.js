import {
  MateriaService,
  InscripcionService,
} from "../services/materias.service.js";

// ════════════════════════════════════════════════════════════════════════════════
//  Logica de Inscripciones y Materias
// ════════════════════════════════════════════════════════════════════════════════

const manejarError = (res, error, mensajeServidor) => {
  console.error("[Controller]:", error.message);
  const msg = error.message || "";

  if (msg.startsWith("VALIDACION") || msg.startsWith("ESTADO_INVALIDO")) {
    return res.status(400).json({ ok: false, error: msg });
  }
  if (msg.startsWith("NO_ENCONTRADO")) {
    return res.status(404).json({ ok: false, error: msg });
  }
  if (msg.startsWith("DUPLICADO") || msg.startsWith("RESTRICCION")) {
    return res.status(409).json({ ok: false, error: msg });
  }
  return res.status(500).json({ ok: false, error: mensajeServidor });
};

/**
 * Parsea y valida un ID entero positivo desde req.params.
 * Retorna null si el valor no es válido.
 */
const parsearId = (valor) => {
  const id = parseInt(valor, 10);
  return isNaN(id) || id <= 0 ? null : id;
};

// ════════════════════════════════════════════════════════════════════════════════
//  MateriaController  —  Endpoints del catálogo de materias
// ════════════════════════════════════════════════════════════════════════════════
export class MateriaController {
  /**
   * GET /api/v1/materias/mis-materias
   * Solo las materias con inscripción activa del usuario autenticado.
   * Incluye modos_inscritos: ["TEST"] | ["EXAMEN"] | ["TEST","EXAMEN"]
   */
  static async obtenerMisMaterias(req, res) {
    try {
      // Sin caché — la lista cambia cuando el admin inscribe/desinscribe al estudiante
      res.setHeader("Cache-Control", "no-store");
      const id_usuario = req.user.id;
      const data = await MateriaService.obtenerMateriasDeUsuario(id_usuario);
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener tus materias.");
    }
  }

  /**
   * POST /api/v1/materias
   * Crea una nueva materia en el catálogo.
   * Solo ADMINISTRADOR (protegido en materia.routes.js).
   */
  static async crearMateria(req, res) {
    try {
      const { nombre } = req.body;
      if (!nombre || nombre.trim() === "") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El nombre de la materia es obligatorio.",
        });
      }
      const data = await MateriaService.crearMateria({ nombre });
      return res
        .status(201)
        .json({ ok: true, mensaje: "Materia creada exitosamente.", data });
    } catch (e) {
      return manejarError(res, e, "Error interno al crear la materia.");
    }
  }

  /**
   * GET /api/v1/materias
   * Lista todas las materias ordenadas alfabéticamente.
   * Accesible para cualquier usuario autenticado.
   */
  static async obtenerMaterias(req, res) {
    try {
      const data = await MateriaService.obtenerMaterias();
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener la lista de materias.");
    }
  }

  /**
   * GET /api/v1/materias/:id_materia
   * Obtiene el detalle de una materia por su ID.
   * Accesible para cualquier usuario autenticado.
   */
  static async obtenerMateriaPorId(req, res) {
    try {
      const id = parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }
      const data = await MateriaService.obtenerMateriaPorId(id);
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener la materia solicitada.");
    }
  }

  /**
   * PUT /api/v1/materias/:id_materia
   * Actualiza el nombre de una materia.
   * Solo ADMINISTRADOR.
   */
  static async actualizarMateria(req, res) {
    try {
      const id = parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }
      const { nombre } = req.body;
      if (!nombre || nombre.trim() === "") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El nombre de la materia es obligatorio.",
        });
      }
      const data = await MateriaService.actualizarMateria(id, { nombre });
      return res.status(200).json({
        ok: true,
        mensaje: "Materia actualizada correctamente.",
        data,
      });
    } catch (e) {
      return manejarError(res, e, "Error al actualizar la materia.");
    }
  }

  /**
   * DELETE /api/v1/materias/:id_materia
   * Eliminación física. Bloqueada si tiene preguntas o inscripciones.
   * Solo ADMINISTRADOR.
   */
  static async eliminarMateria(req, res) {
    try {
      const id = parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }
      const resultado = await MateriaService.eliminarMateria(id);
      return res.status(200).json({ ok: true, mensaje: resultado.mensaje });
    } catch (e) {
      return manejarError(res, e, "Error al eliminar la materia.");
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  InscripcionController  —  Endpoints de inscripciones estudiante ↔ materia
// ════════════════════════════════════════════════════════════════════════════════
export class InscripcionController {
  /**
   * GET /api/v1/inscripciones?busqueda=
   * Lista todas las inscripciones. Acepta búsqueda por nombre/correo/materia.
   */
  static async listar(req, res) {
    try {
      const data = await InscripcionService.listar({
        busqueda: req.query.busqueda,
      });
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al listar inscripciones.");
    }
  }

  /**
   * GET /api/v1/inscripciones/resumen
   * Devuelve { total, activos, inactivos } para las tarjetas de stats.
   */
  static async resumen(req, res) {
    try {
      const data = await InscripcionService.resumen();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener resumen.");
    }
  }

  /**
   * GET /api/v1/inscripciones/estudiantes
   * Lista estudiantes activos para el selector del modal.
   * Solo ADMINISTRADOR.
   */
  static async listarEstudiantes(req, res) {
    try {
      const data = await InscripcionService.listarEstudiantes();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al listar estudiantes.");
    }
  }

  /**
   * GET /api/v1/inscripciones/materias
   * Lista materias para el selector del modal.
   * Solo ADMINISTRADOR.
   */
  static async listarMaterias(req, res) {
    try {
      const data = await InscripcionService.listarMaterias();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al listar materias.");
    }
  }

  /**
   * POST /api/v1/inscripciones
   * Crea una nueva inscripción (estudiante + materia + modo).
   */
  static async crear(req, res) {
    try {
      const { id_usuario, id_materia, modo_evaluacion } = req.body;
      const data = await InscripcionService.crear({
        id_usuario,
        id_materia,
        modo_evaluacion,
      });
      return res.status(201).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al crear inscripción.");
    }
  }

  /**
   * PATCH /api/v1/inscripciones/estado
   * Activa o desactiva una inscripción identificada por PK compuesta.
   * Solo ADMINISTRADOR.
   */
  static async cambiarEstado(req, res) {
    try {
      const { id_usuario, id_materia, modo_evaluacion, activo } = req.body;

      if (!id_usuario || !id_materia || !modo_evaluacion) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: id_usuario, id_materia y modo_evaluacion son requeridos.",
        });
      }
      if (typeof activo !== "boolean") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El campo 'activo' debe ser booleano.",
        });
      }

      const data = await InscripcionService.cambiarEstado(
        parseInt(id_usuario),
        parseInt(id_materia),
        modo_evaluacion,
        activo,
      );
      return res.json({ ok: true, ...data });
    } catch (e) {
      return manejarError(res, e, "Error al cambiar estado de la inscripción.");
    }
  }

  /**
   * DELETE /api/v1/inscripciones
   * Eliminación física identificada por PK compuesta.
   * Solo ADMINISTRADOR.
   */
  static async eliminar(req, res) {
    try {
      const { id_usuario, id_materia, modo_evaluacion } = req.body;

      if (!id_usuario || !id_materia || !modo_evaluacion) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: id_usuario, id_materia y modo_evaluacion son requeridos.",
        });
      }

      const data = await InscripcionService.eliminar(
        parseInt(id_usuario),
        parseInt(id_materia),
        modo_evaluacion,
      );
      return res.json({ ok: true, ...data });
    } catch (e) {
      return manejarError(res, e, "Error al eliminar inscripción.");
    }
  }
}
