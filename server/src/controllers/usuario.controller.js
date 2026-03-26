import { UsuarioService } from "../services/usuario.service.js";
import { ErrorMiddleware } from "../middlewares/errorMiddleware.js";

export class UsuarioController {
  static _normalizarBooleano(valor) {
    if (typeof valor === "boolean") return valor;

    if (typeof valor === "number") {
      if (valor === 1) return true;
      if (valor === 0) return false;
      return null;
    }

    if (typeof valor === "string") {
      const v = valor.trim().toLowerCase();
      if (v === "true" || v === "1") return true;
      if (v === "false" || v === "0") return false;
      return null;
    }

    return null;
  }

  static _parsearId(idRaw) {
    const id = Number(idRaw);

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(
        "VALIDACION: El ID del usuario debe ser un entero positivo válido.",
      );
    }

    return id;
  }

  static async crear(req, res) {
    try {
      const nuevoUsuario = await UsuarioService.crearUsuario(req.body);

      return res.status(201).json({
        ok: true,
        mensaje: "Usuario creado exitosamente.",
        data: nuevoUsuario,
      });
    } catch (error) {
      return ErrorMiddleware.manejar(
        res,
        error,
        "Error interno al crear el usuario.",
      );
    }
  }

  static async listar(req, res) {
    try {
      const filtros = {};

      if (req.query.activo !== undefined) {
        const activo = UsuarioController._normalizarBooleano(req.query.activo);

        if (activo === null) {
          throw new Error(
            "VALIDACION: El filtro 'activo' debe ser booleano (true/false o 1/0).",
          );
        }

        filtros.activo = activo;
      }

      if (req.query.rol !== undefined) {
        if (typeof req.query.rol !== "string") {
          throw new Error("VALIDACION: El filtro 'rol' debe ser texto.");
        }

        if (req.query.rol.trim() !== "") {
          filtros.rol = req.query.rol;
        }
      }

      if (req.query.correo_institucional !== undefined) {
        if (typeof req.query.correo_institucional !== "string") {
          throw new Error(
            "VALIDACION: El filtro 'correo_institucional' debe ser texto.",
          );
        }

        if (req.query.correo_institucional.trim() !== "") {
          filtros.correo_institucional = req.query.correo_institucional;
        }
      }

      const usuarios = await UsuarioService.obtenerUsuarios(filtros);

      return res.status(200).json({
        ok: true,
        data: usuarios,
      });
    } catch (error) {
      return ErrorMiddleware.manejar(
        res,
        error,
        "Error al obtener la lista de usuarios.",
      );
    }
  }

  static async actualizar(req, res) {
    try {
      const id = UsuarioController._parsearId(req.params.id);

      const usuarioActualizado = await UsuarioService.actualizarUsuario(
        id,
        req.body,
      );

      return res.status(200).json({
        ok: true,
        mensaje: "Usuario actualizado correctamente.",
        data: usuarioActualizado,
      });
    } catch (error) {
      return ErrorMiddleware.manejar(
        res,
        error,
        "Error al actualizar el usuario.",
      );
    }
  }

  static async cambiarEstado(req, res) {
    try {
      const id = UsuarioController._parsearId(req.params.id);

      const estadoRaw = req.body?.estado ?? req.body?.activo;

      if (estadoRaw === undefined) {
        throw new Error(
          "VALIDACION: El campo 'estado' (o 'activo') es requerido.",
        );
      }

      const estado = UsuarioController._normalizarBooleano(estadoRaw);

      if (estado === null) {
        throw new Error(
          "VALIDACION: El campo 'estado' debe ser booleano (true/false o 1/0).",
        );
      }

      const resultado = await UsuarioService.cambiarEstadoUsuario(id, estado);

      return res.status(200).json({
        ok: true,
        mensaje: resultado.mensaje,
        data: resultado,
      });
    } catch (error) {
      return ErrorMiddleware.manejar(
        res,
        error,
        "Error al cambiar el estado del usuario.",
      );
    }
  }

  static async eliminar(req, res) {
    try {
      const id = UsuarioController._parsearId(req.params.id);

      const resultado = await UsuarioService.eliminarUsuario(id);

      return res.status(200).json({
        ok: true,
        mensaje: resultado.mensaje,
      });
    } catch (error) {
      return ErrorMiddleware.manejar(
        res,
        error,
        "Error al eliminar permanentemente el usuario.",
      );
    }
  }
}
