import { UniqueConstraintError, ValidationError } from "sequelize";
import { Usuario } from "../models/security.models/usuarioModel.js";
import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";
import { sequelize } from "../config/database.js";

const ROLES_PERMITIDOS = ["ESTUDIANTE", "ADMINISTRADOR"];
const LIMITE_DISPOSITIVOS_POR_DEFECTO = 3;

export class UsuarioService {
  static _validarIdUsuario(id_usuario) {
    const id = Number(id_usuario);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "VALIDACION: El id del usuario debe ser un entero positivo.",
      );
    }

    return id;
  }

  static _normalizarCorreo(correo) {
    if (typeof correo !== "string") {
      throw new Error("VALIDACION: El correo institucional es requerido.");
    }

    const correoNormalizado = correo.trim().toLowerCase();

    if (!correoNormalizado) {
      throw new Error("VALIDACION: El correo institucional es requerido.");
    }

    if (!correoNormalizado.endsWith("@unemi.edu.ec")) {
      throw new Error(
        "VALIDACION: El correo debe ser del dominio @unemi.edu.ec.",
      );
    }

    return correoNormalizado;
  }

  static _normalizarRol(rol, usarDefault = false) {
    if (rol === undefined || rol === null || rol === "") {
      if (usarDefault) return "ESTUDIANTE";
      return undefined;
    }

    if (typeof rol !== "string") {
      throw new Error("VALIDACION: El rol debe ser un texto válido.");
    }

    const rolNormalizado = rol.trim().toUpperCase();

    if (!ROLES_PERMITIDOS.includes(rolNormalizado)) {
      throw new Error(
        `VALIDACION: Rol inválido. Los roles permitidos son: ${ROLES_PERMITIDOS.join(", ")}.`,
      );
    }

    return rolNormalizado;
  }

  static _resolverLimiteDispositivos(valor, usarDefault = false) {
    if (valor === undefined || valor === null || valor === "") {
      if (usarDefault) return LIMITE_DISPOSITIVOS_POR_DEFECTO;
      return undefined;
    }

    const limite = Number(valor);

    if (!Number.isInteger(limite) || limite < 1) {
      throw new Error(
        "VALIDACION: El límite de dispositivos debe ser un entero mayor o igual a 1.",
      );
    }

    return limite;
  }

  static _traducirErrorDB(error) {
    if (error instanceof UniqueConstraintError) {
      if (error.fields?.correo_institucional) {
        return new Error(
          "DUPLICADO: Ya existe un usuario registrado con este correo.",
        );
      }

      if (error.fields?.google_id) {
        return new Error(
          "DUPLICADO: La cuenta de Google ya está vinculada a otro usuario.",
        );
      }

      return new Error("DUPLICADO: Ya existe un registro con esos datos.");
    }

    if (error instanceof ValidationError) {
      const mensaje = error.errors?.[0]?.message || "Datos inválidos.";
      return new Error(`VALIDACION: ${mensaje}`);
    }

    return error;
  }

  static async _revocarSesionesExcedentes(id_usuario, limite, transaction) {
    const sesiones = await SesionDispositivo.findAll({
      where: { id_usuario },
      attributes: ["id_sesion"],
      order: [["fecha_inicio", "ASC"]],
      transaction,
    });

    if (sesiones.length <= limite) {
      return 0;
    }

    const exceso = sesiones.length - limite;
    const idsABorrar = sesiones.slice(0, exceso).map((s) => s.id_sesion);

    await SesionDispositivo.destroy({
      where: { id_sesion: idsABorrar },
      transaction,
    });

    return idsABorrar.length;
  }

  static async crearUsuario(datosUsuario) {
    const correo_institucional = this._normalizarCorreo(
      datosUsuario?.correo_institucional,
    );
    const rol = this._normalizarRol(datosUsuario?.rol, true);
    const limite_dispositivos = this._resolverLimiteDispositivos(
      datosUsuario?.limite_dispositivos,
      true,
    );

    try {
      const existe = await Usuario.findOne({
        where: { correo_institucional },
        attributes: ["id_usuario"],
      });

      if (existe) {
        throw new Error(
          "DUPLICADO: Ya existe un usuario registrado con este correo.",
        );
      }

      const nuevoUsuario = await Usuario.create({
        correo_institucional,
        rol,
        limite_dispositivos,
        activo: true,
      });

      return {
        id_usuario: nuevoUsuario.id_usuario,
        correo_institucional: nuevoUsuario.correo_institucional,
        rol: nuevoUsuario.rol,
        limite_dispositivos: nuevoUsuario.limite_dispositivos,
        activo: nuevoUsuario.activo,
      };
    } catch (error) {
      throw this._traducirErrorDB(error);
    }
  }

  static async obtenerUsuarios(filtros = {}) {
    const where = {};

    if (typeof filtros.activo === "boolean") {
      where.activo = filtros.activo;
    }

    if (filtros.rol !== undefined) {
      where.rol = this._normalizarRol(filtros.rol);
    }

    if (
      typeof filtros.correo_institucional === "string" &&
      filtros.correo_institucional.trim() !== ""
    ) {
      where.correo_institucional = filtros.correo_institucional
        .trim()
        .toLowerCase();
    }

    return await Usuario.findAll({
      where,
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

  static async actualizarUsuario(id_usuario, datosActualizacion = {}) {
    const id = this._validarIdUsuario(id_usuario);

    const hayRol = Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      "rol",
    );
    const hayLimite = Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      "limite_dispositivos",
    );

    if (!hayRol && !hayLimite) {
      throw new Error(
        "VALIDACION: Debe enviar al menos un campo válido para actualizar.",
      );
    }

    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id, { transaction: t });

      if (!usuario) {
        throw new Error("NO_ENCONTRADO: El usuario no existe.");
      }

      if (hayRol) {
        usuario.rol = this._normalizarRol(datosActualizacion.rol);
      }

      let sesionesRevocadas = 0;

      if (hayLimite) {
        usuario.limite_dispositivos = this._resolverLimiteDispositivos(
          datosActualizacion.limite_dispositivos,
        );
      }

      await usuario.save({ transaction: t });

      if (hayLimite) {
        sesionesRevocadas = await this._revocarSesionesExcedentes(
          usuario.id_usuario,
          usuario.limite_dispositivos,
          t,
        );
      }

      await t.commit();

      return {
        id_usuario: usuario.id_usuario,
        correo_institucional: usuario.correo_institucional,
        rol: usuario.rol,
        limite_dispositivos: usuario.limite_dispositivos,
        activo: usuario.activo,
        sesiones_revocadas: sesionesRevocadas,
      };
    } catch (error) {
      await t.rollback();
      throw this._traducirErrorDB(error);
    }
  }

  static async cambiarEstadoUsuario(id_usuario, estado) {
    const id = this._validarIdUsuario(id_usuario);

    if (typeof estado !== "boolean") {
      throw new Error("VALIDACION: El estado debe ser booleano.");
    }

    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id, { transaction: t });

      if (!usuario) {
        throw new Error("NO_ENCONTRADO: El usuario no existe.");
      }

      usuario.activo = estado;
      await usuario.save({ transaction: t });

      if (estado === false) {
        await SesionDispositivo.destroy({
          where: { id_usuario: id },
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
      throw this._traducirErrorDB(error);
    }
  }

  static async eliminarUsuario(id_usuario) {
    const id = this._validarIdUsuario(id_usuario);
    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findByPk(id, { transaction: t });

      if (!usuario) {
        throw new Error("NO_ENCONTRADO: El usuario no existe.");
      }

      if (usuario.activo) {
        throw new Error(
          "ESTADO_INVALIDO: Desactiva el usuario antes de eliminarlo permanentemente.",
        );
      }

      const intentos = await Intento.findAll({
        where: { id_usuario: id },
        attributes: ["id_intento"],
        transaction: t,
      });

      const idsIntentos = intentos.map((i) => i.id_intento);

      if (idsIntentos.length > 0) {
        await DetalleIntento.destroy({
          where: { id_intento: idsIntentos },
          transaction: t,
        });
      }

      await Intento.destroy({
        where: { id_usuario: id },
        transaction: t,
      });

      await Inscripcion.destroy({
        where: { id_usuario: id },
        transaction: t,
      });

      await SesionDispositivo.destroy({
        where: { id_usuario: id },
        transaction: t,
      });

      await usuario.destroy({ transaction: t });

      await t.commit();

      return {
        mensaje:
          "Registro de usuario, evaluaciones, inscripciones y sesiones eliminados permanentemente.",
      };
    } catch (error) {
      await t.rollback();
      throw this._traducirErrorDB(error);
    }
  }
}
