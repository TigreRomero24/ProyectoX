import {
  MateriaService,
  InscripcionService,
} from "../services/materias.service.js";
import { deleteFileIfExists } from "../utils/mediaUpload.js";

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

const parsearId = (valor) => {
  const id = parseInt(valor, 10);
  return isNaN(id) || id <= 0 ? null : id;
};

// ════════════════════════════════════════════════════════════════════════════════
//  MateriaController  —  Endpoints del catálogo de materias
// ════════════════════════════════════════════════════════════════════════════════
export class MateriaController {
  static async obtenerMisMaterias(req, res) {
    try {
      res.setHeader("Cache-Control", "no-store");
      const id_usuario = req.user.id;
      const data = await MateriaService.obtenerMateriasDeUsuario(id_usuario);
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener tus materias.");
    }
  }

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

  static async obtenerMaterias(req, res) {
    try {
      const data = await MateriaService.obtenerMaterias();
      return res.status(200).json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener la lista de materias.");
    }
  }

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

  static async subirImagenMateria(req, res) {
    try {
      const id = parsearId(req.params.id_materia);
      if (!id) {
        await deleteFileIfExists(req.file?.path);
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: Debe enviar un archivo en el campo 'imagen'.",
        });
      }

      const data = await MateriaService.subirImagenMateria(id, req.file);
      return res.status(200).json({
        ok: true,
        mensaje: "Imagen de materia actualizada correctamente.",
        data,
      });
    } catch (e) {
      await deleteFileIfExists(req.file?.path);
      return manejarError(res, e, "Error al subir imagen de la materia.");
    }
  }

  static async eliminarImagenMateria(req, res) {
    try {
      const id = parsearId(req.params.id_materia);
      if (!id) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El ID de la materia debe ser un número entero positivo.",
        });
      }

      const data = await MateriaService.eliminarImagenMateria(id);
      return res.status(200).json({
        ok: true,
        mensaje: "Imagen de materia eliminada correctamente.",
        data,
      });
    } catch (e) {
      return manejarError(res, e, "Error al eliminar imagen de la materia.");
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  InscripcionController  —  Endpoints de inscripciones estudiante ↔ materia
// ════════════════════════════════════════════════════════════════════════════════
export class InscripcionController {
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

  static async resumen(req, res) {
    try {
      const data = await InscripcionService.resumen();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al obtener resumen.");
    }
  }

  static async listarEstudiantes(req, res) {
    try {
      const data = await InscripcionService.listarEstudiantes();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al listar estudiantes.");
    }
  }

  static async listarMaterias(req, res) {
    try {
      const data = await InscripcionService.listarMaterias();
      return res.json({ ok: true, data });
    } catch (e) {
      return manejarError(res, e, "Error al listar materias.");
    }
  }

  static async crear(req, res) {
    try {
      const id_usuario = parsearId(req.body?.id_usuario);
      const id_materia = parsearId(req.body?.id_materia);
      const { modo_evaluacion } = req.body || {};

      if (!id_usuario || !id_materia) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: id_usuario e id_materia son requeridos.",
        });
      }

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
