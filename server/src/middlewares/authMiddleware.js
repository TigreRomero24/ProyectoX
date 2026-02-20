import { Usuario, Dispositivo } from "../models/relacionesModel.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, mensaje: "Token requerido" });
    }

    const token = authHeader.split(" ")[1];
    const tokenFactory = TokenFactory.create("ACCESS", env.jwt);

    let decoded;
    try {
      decoded = tokenFactory.verifyToken(token);
    } catch (error) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Token inválido o expirado" });
    }

    // BUSCAMOS AL USUARIO E INCLUIMOS TODOS SUS DISPOSITIVOS VINCULADOS
    const usuario = await Usuario.findByPk(decoded.id, {
      include: [
        {
          model: Dispositivo,
          as: "dispositivo",
        },
      ],
    });

    if (!usuario || !usuario.activo) {
      return res
        .status(401)
        .json({ ok: false, mensaje: "Usuario no autorizado o inactivo" });
    }

    // VALIDAR SESIÓN STATEFUL
    if (usuario.token_sesion_actual !== token) {
      return res.status(401).json({
        ok: false,
        mensaje: "Sesión cerrada o iniciada en otro lugar",
      });
    }

    // Inyectamos el usuario con su lista de dispositivos
    req.usuario = usuario;
    next();
  } catch (error) {
    console.error("🔴 Error en AuthMiddleware:", error);
    return res
      .status(500)
      .json({ ok: false, mensaje: "Error interno en autenticación" });
  }
};
