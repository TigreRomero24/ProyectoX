import { env } from "../config/environment.js";
import { TokenFactory } from "../utils/tokenFactory.js";

export class AuthMiddleware {
  static handle(req, res, next) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          ok: false,
          codigo: "TOKEN_REQUERIDO",
          mensaje:
            "Acceso denegado. Token no proporcionado o formato inválido.",
        });
      }

      const token = authHeader.split(" ")[1];
      const accessFactory = TokenFactory.create("ACCESS", env.jwt);

      const decoded = accessFactory.verifyToken(token);

      req.user = decoded;

      next();
    } catch (error) {
      if (
        error.message === "ACCESS_TOKEN_EXPIRED" ||
        error.name === "TokenExpiredError"
      ) {
        return res.status(401).json({
          ok: false,
          codigo: "TOKEN_EXPIRADO",
          mensaje: "Su sesión ha expirado.",
        });
      }

      return res.status(401).json({
        ok: false,
        codigo: "TOKEN_INVALIDO",
        mensaje: "Token inválido o corrupto.",
      });
    }
  }

  static authorize(rolesPermitidos = []) {
    return (req, res, next) => {
      if (!req.user || !req.user.rol) {
        return res.status(403).json({
          ok: false,
          codigo: "IDENTIDAD_DESCONOCIDA",
          mensaje: "No se pudo determinar el rol del usuario.",
        });
      }

      if (!rolesPermitidos.includes(req.user.rol)) {
        return res.status(403).json({
          ok: false,
          codigo: "ACCESO_DENEGADO",
          mensaje: "No tiene los permisos necesarios.",
        });
      }

      next();
    };
  }
}
