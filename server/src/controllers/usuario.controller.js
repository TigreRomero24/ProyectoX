import { UsuarioService } from "../services/usuario.service.js";

/**
 * @class
 * @description
 */
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

  static _manejarError(res, error, mensajeServidor) {
    console.error(`[Error UsuarioController]:`, error);
    const msg = error.message;

    if (
      msg.startsWith("VALIDACION") ||
      msg.startsWith("ESTADO_INVALIDO") ||
      msg.startsWith("PAYLOAD_INVALIDO")
    ) {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg.startsWith("DUPLICADO")) {
      return res.status(409).json({ ok: false, error: msg });
    }
    if (msg.startsWith("NO_ENCONTRADO")) {
      return res.status(404).json({ ok: false, error: msg });
    }

    return res.status(500).json({ ok: false, error: mensajeServidor });
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
      return UsuarioController._manejarError(
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
        filtros.activo = req.query.activo === "true";
      }

      if (req.query.rol) {
        filtros.rol = req.query.rol.trim().toUpperCase();
      }

      const usuarios = await UsuarioService.obtenerUsuarios(filtros);
      return res.status(200).json({ ok: true, data: usuarios });
    } catch (error) {
      return UsuarioController._manejarError(
        res,
        error,
        "Error al obtener la lista de usuarios.",
      );
    }
  }

  static async actualizar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El ID del usuario debe ser un número válido.",
        });
      }

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
      return UsuarioController._manejarError(
        res,
        error,
        "Error al actualizar el usuario.",
      );
    }
  }

  static async cambiarEstado(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El ID del usuario debe ser un número válido.",
        });
      }

      const estadoRaw = req.body.estado ?? req.body.activo;

      if (estadoRaw === undefined) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El campo 'estado' (o 'activo') es requerido.",
        });
      }

      const estado = UsuarioController._normalizarBooleano(estadoRaw);

      if (estado === null) {
        return res.status(400).json({
          ok: false,
          error:
            "VALIDACION: El campo 'estado' debe ser booleano (true/false o 1/0).",
        });
      }

      const resultado = await UsuarioService.cambiarEstadoUsuario(id, estado);
      return res.status(200).json({
        ok: true,
        mensaje: resultado.mensaje,
        data: resultado,
      });
    } catch (error) {
      return UsuarioController._manejarError(
        res,
        error,
        "Error al cambiar el estado del usuario.",
      );
    }
  }

  static async eliminar(req, res) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El ID del usuario debe ser un número válido.",
        });
      }

      const resultado = await UsuarioService.eliminarUsuario(id);
      return res.status(200).json({
        ok: true,
        mensaje: resultado.mensaje,
      });
    } catch (error) {
      return UsuarioController._manejarError(
        res,
        error,
        "Error al eliminar permanentemente el usuario.",
      );
    }
  }
}
