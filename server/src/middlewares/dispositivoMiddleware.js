import { LogSeguridad, Dispositivo } from "../models/relacionesModel.js";

export const dispositivoMiddleware = async (req, res, next) => {
  try {
    const huellaEnviada = req.headers["x-device-fingerprint"]?.trim();

    if (!huellaEnviada) {
      return res
        .status(400)
        .json({ ok: false, mensaje: "X-Device-Fingerprint es obligatorio" });
    }

    // Buscar TODOS los dispositivos de este usuario en la BD
    const misDispositivosDB = await Dispositivo.findAll({
      where: { id_usuario: req.usuario.id_usuario },
    });

    const dispositivoValido = await Dispositivo.findOne({
      where: {
        id_usuario: req.usuario.id_usuario,
        huella_hash: huellaEnviada,
      },
    });

    if (!dispositivoValido) {
      console.warn(
        `[Seguridad] Bloqueo 403 - Usuario: ${req.usuario.id_usuario} | Dispositivo no autorizado.`,
      );

      await LogSeguridad.create({
        id_usuario: req.usuario.id_usuario,
        ip_origen: req.ip,
        accion: "BLOQUEO_DISPOSITIVO_DESCONOCIDO",
        detalles: `Intento de acceso con huella no vinculada: ${huellaEnviada}`,
      });

      return res.status(403).json({
        ok: false,
        codigo: "DISPOSITIVO_NO_AUTORIZADO",
        mensaje:
          "Este dispositivo no está vinculado a tu cuenta. Por favor, vincúlalo primero.",
      });
    }

    next();
  } catch (error) {
    console.error("🔴 Error en dispositivoMiddleware:", error);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error al validar integridad del equipo" });
  }
};
