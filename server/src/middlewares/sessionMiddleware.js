import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { Usuario } from "../models/security.models/usuarioModel.js";

export class SessionMiddleware {
  static async handle(req, res, next) {
    try {
      const { id, dispositivoId } = req.user;

      if (!id || !dispositivoId) {
        return res.status(401).json({
          ok: false,
          codigo: "PAYLOAD_INVALIDO",
          mensaje:
            "El token de acceso no contiene la identificación del dispositivo.",
        });
      }

      const sesionActiva = await SesionDispositivo.findOne({
        where: {
          id_usuario: id,
          dispositivo_id: dispositivoId,
        },
        include: [
          {
            model: Usuario,
            as: "propietario",
            attributes: ["activo"],
          },
        ],
      });

      if (!sesionActiva) {
        return res.status(401).json({
          ok: false,
          codigo: "SESION_REVOCADA",
          mensaje:
            "Su sesión ha sido revocada por límite de dispositivos o cerrada en otro equipo.",
        });
      }

      if (!sesionActiva.propietario.activo) {
        return res.status(401).json({
          ok: false,
          codigo: "USUARIO_INACTIVO",
          mensaje:
            "Su cuenta ha sido deshabilitada. Contacte al administrador.",
        });
      }

      next();
    } catch (error) {
      console.error("[SessionMiddleware Error]:", error);
      return res.status(500).json({
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje:
          "Error interno al verificar el estado de la sesión en la base de datos.",
      });
    }
  }
}
