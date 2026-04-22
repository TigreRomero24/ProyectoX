import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
// Importar desde index.js garantiza que sean las mismas instancias
// que usaron relacionesModel.js para definir las asociaciones.
// Si se importan desde rutas individuales Sequelize no reconoce los joins.
import {
  Materia,
  BancoPregunta,
  Inscripcion,
  Usuario,
} from "../models/index.js";
import { deleteMateriaImageByUrl } from "../utils/mediaUpload.js";

// ════════════════════════════════════════════════════════════════════════════════
//  MateriaService  —  CRUD del catálogo de materias
// ════════════════════════════════════════════════════════════════════════════════
export class MateriaService {
  // ─── DTO privado ─────────────────────────────────────────────────────────────
  static #buildDTO(datos) {
    const dto = {};
    if (datos.nombre !== undefined) dto.nombre = datos.nombre;
    if (datos.img !== undefined) dto.img = datos.img;
    return dto;
  }

  // ─── Crear ───────────────────────────────────────────────────────────────────
  static async crearMateria(datosMateria) {
    if (!datosMateria?.nombre || datosMateria.nombre.trim() === "") {
      throw new Error("VALIDACION: El nombre de la materia es obligatorio.");
    }

    const nombreNormalizado = datosMateria.nombre.trim().toUpperCase();

    const existe = await Materia.findOne({
      where: { nombre: nombreNormalizado },
      attributes: ["id_materia"],
    });
    if (existe) {
      throw new Error(
        `DUPLICADO: Ya existe una materia registrada con el nombre '${nombreNormalizado}'.`,
      );
    }

    const nueva = await Materia.create({
      nombre: datosMateria.nombre,
      img: datosMateria.img || null,
    });
    return nueva.get({ plain: true });
  }

  // ─── Listar todas ────────────────────────────────────────────────────────────
  static async obtenerMaterias() {
    return Materia.findAll({
      attributes: ["id_materia", "nombre", "img", "createdAt"],
      order: [["nombre", "ASC"]],
      raw: true,
    });
  }

  // ─── Listar solo las materias del usuario autenticado ────────────────────────
  /**
   * Devuelve las materias con inscripciones activas del usuario.
   * Incluye modos_inscritos: ["TEST"] | ["EXAMEN"] | ["TEST","EXAMEN"]
   * para que el frontend filtre las configuraciones disponibles.
   */
  static async obtenerMateriasDeUsuario(id_usuario) {
    const inscripciones = await Inscripcion.findAll({
      where: { id_usuario, activo: true },
      include: [{ model: Materia, attributes: ["id_materia", "nombre", "img"] }],
      raw: true,
      nest: true,
    });

    if (!inscripciones.length) return [];

    // Agrupa por materia y acumula los modos inscritos
    const mapaMateria = new Map();

    for (const ins of inscripciones) {
      // Sequelize con raw:true+nest:true puede usar distintos nombres según tableName
      const mat = ins.Materia ?? ins.Materium ?? ins.matedum;
      const id = mat?.id_materia;
      if (!id) continue;

      if (!mapaMateria.has(id)) {
        mapaMateria.set(id, {
          id_materia: mat.id_materia,
          nombre: mat.nombre,
          img: mat.img,
          modos_inscritos: ["TEST", "EXAMEN"], // Ahora siempre tiene ambos modos si está inscrito
        });
      }
    }

    return Array.from(mapaMateria.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }

  // ─── Obtener por ID ──────────────────────────────────────────────────────────
  static async obtenerMateriaPorId(id_materia) {
    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia", "nombre", "img", "createdAt"],
    });
    if (!materia)
      throw new Error("NO_ENCONTRADO: La materia solicitada no existe.");
    return materia.get({ plain: true });
  }

  // ─── Actualizar ──────────────────────────────────────────────────────────────
  static async actualizarMateria(id_materia, datosMateria) {
    const dto = MateriaService.#buildDTO(datosMateria);
    if (Object.keys(dto).length === 0) {
      throw new Error(
        "VALIDACION: No se enviaron campos válidos para actualizar.",
      );
    }

    const t = await sequelize.transaction();
    try {
      const materia = await Materia.findByPk(id_materia, { transaction: t });
      if (!materia) throw new Error("NO_ENCONTRADO: La materia no existe.");

      if (dto.nombre) {
        const nombreNormalizado = dto.nombre.trim().toUpperCase();
        const colision = await Materia.findOne({
          where: {
            nombre: nombreNormalizado,
            id_materia: { [Op.ne]: id_materia },
          },
          attributes: ["id_materia"],
          transaction: t,
        });
        if (colision) {
          throw new Error(
            `DUPLICADO: El nombre '${nombreNormalizado}' ya está en uso por otra materia.`,
          );
        }
      }

      // Si se sube una nueva imagen, eliminar la anterior
      if (dto.img && materia.img) {
        await deleteMateriaImageByUrl(materia.img);
      }

      await materia.update(dto, { transaction: t });
      await t.commit();
      return materia.get({ plain: true });
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  // ─── Eliminar ────────────────────────────────────────────────────────────────
  static async eliminarMateria(id_materia) {
    const t = await sequelize.transaction();
    try {
      const materia = await Materia.findByPk(id_materia, { transaction: t });
      if (!materia) throw new Error("NO_ENCONTRADO: La materia no existe.");

      const cantPreguntas = await BancoPregunta.count({
        where: { id_materia },
        transaction: t,
      });
      if (cantPreguntas > 0) {
        throw new Error(
          `RESTRICCION: No se puede eliminar la materia porque tiene ${cantPreguntas} pregunta(s) en el banco. Elimine o reasigne las preguntas primero.`,
        );
      }

      const cantInscripciones = await Inscripcion.count({
        where: { id_materia },
        transaction: t,
      });
      if (cantInscripciones > 0) {
        throw new Error(
          `RESTRICCION: No se puede eliminar la materia porque tiene ${cantInscripciones} inscripción(es) asociada(s). Elimine las inscripciones primero.`,
        );
      }

      await materia.destroy({ transaction: t, force: true });
      await t.commit();
      return { mensaje: "Materia eliminada permanentemente del sistema." };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════════
//  InscripcionService  —  Gestión de inscripciones estudiante ↔ materia
// ════════════════════════════════════════════════════════════════════════════════

const nombreDesdeCorreo = (correo = "") => correo.split("@")[0];

const toDTO = (ins) => ({
  id_usuario: ins.id_usuario,
  id_materia: ins.id_materia,
  nombre_usuario: nombreDesdeCorreo(ins.Usuario?.correo_institucional),
  correo: ins.Usuario?.correo_institucional || "",
  nombre_materia: (ins.Materia ?? ins.Materium ?? ins.matedum)?.nombre || "",
  activo: ins.activo,
  fecha_inscripcion: ins.fecha_inscripcion,
});

const WITH_ASSOCIATIONS = {
  include: [
    { model: Usuario, attributes: ["id_usuario", "correo_institucional"] },
    { model: Materia, attributes: ["id_materia", "nombre"] },
  ],
};

export class InscripcionService {
  // ─── Listar con búsqueda opcional ────────────────────────────────────────────
  static async listar({ busqueda } = {}) {
    const rows = await Inscripcion.findAll({
      ...WITH_ASSOCIATIONS,
      order: [["fecha_inscripcion", "DESC"]],
    });

    const data = rows.map(toDTO);
    if (!busqueda) return data;

    const q = busqueda.toLowerCase();
    return data.filter(
      (d) =>
        d.nombre_usuario.toLowerCase().includes(q) ||
        d.correo.toLowerCase().includes(q) ||
        d.nombre_materia.toLowerCase().includes(q),
    );
  }

  // ─── Resumen de estadísticas ─────────────────────────────────────────────────
  static async resumen() {
    const total = await Inscripcion.count();
    const activos = await Inscripcion.count({ where: { activo: true } });
    return { total, activos, inactivos: total - activos };
  }

  // ─── Datos de soporte para el modal ──────────────────────────────────────────
  static async listarEstudiantes() {
    const rows = await Usuario.findAll({
      where: { rol: { [Op.in]: ["ESTUDIANTE", "ADMINISTRADOR"] }, activo: true },
      attributes: ["id_usuario", "correo_institucional", "rol"],
      order: [["correo_institucional", "ASC"]],
    });
    return rows.map((u) => ({
      id_usuario: u.id_usuario,
      correo: u.correo_institucional,
      nombre: nombreDesdeCorreo(u.correo_institucional),
      rol: u.rol,
    }));
  }

  static async listarMaterias() {
    return Materia.findAll({
      attributes: ["id_materia", "nombre"],
      order: [["nombre", "ASC"]],
    });
  }

  // ─── Crear inscripción ───────────────────────────────────────────────────────
  static async crear({ id_usuario, id_materia }) {
    if (!id_usuario || !id_materia) {
      throw new Error(
        "VALIDACION: id_usuario y id_materia son requeridos.",
      );
    }

    const usuario = await Usuario.findByPk(id_usuario, {
      attributes: ["id_usuario", "correo_institucional", "rol", "activo"],
    });
    if (!usuario) throw new Error("NO_ENCONTRADO: El usuario no existe.");
    if (!["ESTUDIANTE", "ADMINISTRADOR"].includes(usuario.rol)) {
      throw new Error(
        "VALIDACION: Solo se pueden inscribir usuarios con rol ESTUDIANTE o ADMINISTRADOR.",
      );
    }
    if (!usuario.activo) {
      throw new Error("VALIDACION: El usuario tiene la cuenta desactivada.");
    }

    const materia = await Materia.findByPk(id_materia);
    if (!materia) throw new Error("NO_ENCONTRADO: La materia no existe.");

    const existe = await Inscripcion.findOne({
      where: { id_usuario, id_materia },
    });
    if (existe) {
      throw new Error(
        `DUPLICADO: El estudiante ya está inscrito en esta materia.`,
      );
    }

    await Inscripcion.create({
      id_usuario,
      id_materia,
      activo: true,
    });

    const nueva = await Inscripcion.findOne({
      where: { id_usuario, id_materia },
      ...WITH_ASSOCIATIONS,
    });
    return toDTO(nueva);
  }

  // ─── Cambiar estado ──────────────────────────────────────────────────────────
  static async cambiarEstado(id_usuario, id_materia, activo) {
    const ins = await Inscripcion.findOne({
      where: { id_usuario, id_materia },
    });
    if (!ins) throw new Error("NO_ENCONTRADO: Inscripción no encontrada.");
    await ins.update({ activo });
    return {
      mensaje: `Inscripción ${activo ? "activada" : "desactivada"} correctamente.`,
    };
  }

  // ─── Eliminar inscripción ────────────────────────────────────────────────────
  static async eliminar(id_usuario, id_materia) {
    const ins = await Inscripcion.findOne({
      where: { id_usuario, id_materia },
    });
    if (!ins) throw new Error("NO_ENCONTRADO: Inscripción no encontrada.");
    if (ins.activo) {
      throw new Error(
        "RESTRICCION: Desactiva la inscripción antes de eliminarla.",
      );
    }
    await ins.destroy();
    return { mensaje: "Inscripción eliminada correctamente." };
  }
}
