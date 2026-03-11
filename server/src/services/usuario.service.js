import { Usuario } from "../models/security.models/usuarioModel.js";
import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";
import { sequelize } from "../config/database.js";

const ROLES_PERMITIDOS = ["ESTUDIANTE", "ADMINISTRADOR"];

/**
 * @class
 * @description
 */
export class UsuarioService {
  /**
   * @method crearUsuario
   */
  static async crearUsuario(datosUsuario) {
    const correoInput = datosUsuario?.correo_institucional
      ?.trim()
      .toLowerCase();
    const rol = datosUsuario?.rol?.trim().toUpperCase() || "ESTUDIANTE";
    const limite_dispositivos = datosUsuario?.limite_dispositivos || 3;

    if (!correoInput) {
      throw new Error("VALIDACION: El correo institucional es requerido.");
    }

    if (!correoInput.endsWith("@unemi.edu.ec")) {
      throw new Error(
        "VALIDACION: El correo debe ser del dominio @unemi.edu.ec",
      );
    }

    if (!ROLES_PERMITIDOS.includes(rol)) {
      throw new Error(
        `VALIDACION: Rol inválido. Los roles permitidos son: ${ROLES_PERMITIDOS.join(", ")}.`,
      );
    }

    const existe = await Usuario.findOne({
      where: { correo_institucional: correoInput },
    });
    if (existe) {
      throw new Error(
        "DUPLICADO: Ya existe un usuario registrado con este correo.",
      );
    }

    const nuevoUsuario = await Usuario.create({
      correo_institucional: correoInput,
      rol: rol,
      limite_dispositivos: limite_dispositivos,
      activo: true,
    });

    return {
      id_usuario: nuevoUsuario.id_usuario,
      correo_institucional: nuevoUsuario.correo_institucional,
      rol: nuevoUsuario.rol,
      limite_dispositivos: nuevoUsuario.limite_dispositivos,
      activo: nuevoUsuario.activo,
    };
  }

  /**
   * @method obtenerUsuarios
   */
  static async obtenerUsuarios(filtros = {}) {
    return await Usuario.findAll({
      where: filtros,
      attributes: [
        "id_usuario",
        "correo_institucional",
        "rol",
        "limite_dispositivos",
        "activo",
      ],
      order: [["id_usuario", "DESC"]],
    });
  }

  /**
   * @method actualizarUsuario
   */
  static async actualizarUsuario(id_usuario, datosActualizacion) {
    const usuario = await Usuario.findByPk(id_usuario);

    if (!usuario) {
      throw new Error("NO_ENCONTRADO: El usuario no existe.");
    }

    if (datosActualizacion.rol) {
      const nuevoRol = datosActualizacion.rol.trim().toUpperCase();

      // Validación estricta de ENUM para actualización
      if (!ROLES_PERMITIDOS.includes(nuevoRol)) {
        throw new Error(
          `VALIDACION: Rol inválido. Los roles permitidos son: ${ROLES_PERMITIDOS.join(", ")}.`,
        );
      }
      usuario.rol = nuevoRol;
    }

    if (datosActualizacion.limite_dispositivos !== undefined) {
      usuario.limite_dispositivos = datosActualizacion.limite_dispositivos;
    }

    await usuario.save();

    return {
      id_usuario: usuario.id_usuario,
      correo_institucional: usuario.correo_institucional,
      rol: usuario.rol,
      limite_dispositivos: usuario.limite_dispositivos,
      activo: usuario.activo,
    };
  }

  /**
   * @method cambiarEstadoUsuario
   */
  static async cambiarEstadoUsuario(id_usuario, estado) {
    if (typeof estado !== "boolean") {
      throw new Error("VALIDACION: El estado debe ser booleano.");
    }

    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id_usuario, { transaction: t });
      if (!usuario) {
        throw new Error("NO_ENCONTRADO: El usuario no existe.");
      }

      usuario.activo = estado;
      await usuario.save({ transaction: t });

      if (estado === false) {
        await SesionDispositivo.destroy({
          where: { id_usuario },
          transaction: t,
        });
      }

      await t.commit();

      return {
        id_usuario: usuario.id_usuario,
        correo_institucional: usuario.correo_institucional,
        activo: usuario.activo,
        mensaje: estado
          ? "Usuario activado."
          : "Usuario desactivado y sesiones cerradas.",
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  /**
   * @method eliminarUsuario
   */
  static async eliminarUsuario(id_usuario) {
    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id_usuario, { transaction: t });

      if (!usuario) {
        throw new Error("NO_ENCONTRADO: El usuario no existe.");
      }

      // Guard de estado: Prohíbe eliminar si el usuario sigue activo
      if (usuario.activo) {
        throw new Error(
          "ESTADO_INVALIDO: Desactiva el usuario antes de eliminarlo permanentemente.",
        );
      }

      // 1. Obtener los intentos del usuario para borrar los detalles en cascada
      const intentos = await Intento.findAll({
        where: { id_usuario },
        attributes: ["id_intento"],
        transaction: t,
      });
      const idsIntentos = intentos.map((i) => i.id_intento);

      // 2. Eliminar detalles de los intentos (si existen)
      if (idsIntentos.length > 0) {
        await DetalleIntento.destroy({
          where: { id_intento: idsIntentos }, // Ajusta "id_intento" según el nombre de tu FK
          transaction: t,
        });
      }

      // 3. Eliminar los intentos de evaluación
      await Intento.destroy({
        where: { id_usuario },
        transaction: t,
      });

      // 4. Eliminar inscripciones a materias
      await Inscripcion.destroy({
        where: { id_usuario },
        transaction: t,
      });

      // 5. Eliminar sesiones (por seguridad, aunque al desactivar ya deberían haberse borrado)
      await SesionDispositivo.destroy({
        where: { id_usuario },
        transaction: t,
      });

      // 6. Eliminar físicamente al usuario
      await usuario.destroy({ transaction: t });

      await t.commit();

      return {
        mensaje:
          "Registro de usuario, evaluaciones, inscripciones y sesiones eliminados permanentemente.",
      };
    } catch (error) {
      await t.rollback();
      // Mantenemos el stack trace original lanzando el error directamente
      throw error;
    }
  }
}
