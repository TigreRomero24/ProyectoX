import { AuthService } from "../services/auth.service.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth/refresh",
};

const ERROR_CODES = {
  ACCESO_DENEGADO: "correo_no_institucional",
  USUARIO_NO_REGISTRADO: "usuario_no_registrado",
  USUARIO_INACTIVO: "usuario_inactivo",
  VALIDACION: "google_auth_failed",
};

function codigoDeError(errorMessage) {
  for (const [prefijo, codigo] of Object.entries(ERROR_CODES)) {
    if (errorMessage?.startsWith(prefijo)) return codigo;
  }
  return "google_auth_failed";
}

export class AuthController {
  static _frontendUrl(req) {
    const oauthUrl = req.oauthFrontendUrl?.trim();
    if (oauthUrl) return oauthUrl.replace(/\/+$/, "");

    const envUrl = process.env.FRONTEND_URL?.trim();
    if (envUrl) return envUrl.replace(/\/+$/, "");

    const origin = req.headers.origin?.trim();
    if (origin) return origin.replace(/\/+$/, "");

    const referer = req.headers.referer;
    if (referer) {
      try {
        return new URL(referer).origin;
      } catch (_) {}
    }

    return "http://localhost:3000";
  }

  static async googleCallback(req, res) {
    const frontendUrl = AuthController._frontendUrl(req);

    try {
      const googleProfile = req.user;
      const ip =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
      const userAgent = req.headers["user-agent"] || "Dispositivo_Desconocido";
      const dispositivoId = Buffer.from(`${ip}-${userAgent}`)
        .toString("base64")
        .substring(0, 50);

      const { accessToken, refreshToken } =
        await AuthService.procesarLoginGoogle(googleProfile, dispositivoId);

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
      return res.redirect(`${frontendUrl}/dashboard?token=${accessToken}`);
    } catch (error) {
      console.error("[AuthController googleCallback]:", error.message);
      const codigo = codigoDeError(error.message);
      return res.redirect(`${frontendUrl}/login?error=${codigo}`);
    }
  }

  static async refreshToken(req, res) {
    try {
      const refreshTokenCrudo = req.cookies?.refreshToken;
      if (!refreshTokenCrudo) {
        return res.status(401).json({
          ok: false,
          codigo: "REFRESH_REQUERIDO",
          mensaje: "No se encontró credencial de renovación en las cookies.",
        });
      }

      const { newAccessToken, newRefreshToken } =
        await AuthService.renovarToken(refreshTokenCrudo);

      res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);
      return res.status(200).json({ ok: true, accessToken: newAccessToken });
    } catch (error) {
      console.error("[AuthController refreshToken]:", error.message);
      res.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });
      return res.status(401).json({
        ok: false,
        codigo: "SESION_INVALIDA",
        mensaje: error.message,
      });
    }
  }

  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      let payload = null;

      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const accessToken = authHeader.split(" ")[1];
          const accessFactory = TokenFactory.create("ACCESS", env.jwt);
          payload = accessFactory.verifyToken(accessToken, {
            ignoreExpiration: true,
          });
        } catch (_) {}
      }

      if (!payload && req.cookies?.refreshToken) {
        try {
          const refreshFactory = TokenFactory.create("REFRESH", env.jwt);
          payload = refreshFactory.verifyToken(req.cookies.refreshToken, {
            ignoreExpiration: true,
          });
        } catch (_) {}
      }

      if (payload?.dispositivoId && payload?.id) {
        await AuthService.cerrarSesion(payload.dispositivoId, payload.id);
      }

      res.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });
      res.clearCookie("refreshToken", { path: "/" });
      res.clearCookie("refreshToken");

      return res
        .status(200)
        .json({ ok: true, mensaje: "Sesión cerrada correctamente." });
    } catch (error) {
      console.error("[AuthController logout]:", error);
      res.clearCookie("refreshToken", { path: "/api/v1/auth/refresh" });
      res.clearCookie("refreshToken", { path: "/" });
      res.clearCookie("refreshToken");
      return res
        .status(200)
        .json({ ok: true, mensaje: "Sesión cerrada localmente." });
    }
  }
}
