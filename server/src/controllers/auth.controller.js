import { AuthService } from "../services/auth.service.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";
import { parseDuration } from "../utils/duration.js";

const accessFactory = TokenFactory.create("ACCESS", env.jwt);
const refreshFactory = TokenFactory.create("REFRESH", env.jwt);

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  maxAge: parseDuration(env.jwt.refreshExpiresIn),
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

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax",
    path: "/api/v1/auth/refresh",
  });
}

function buildDeviceId(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(
        forwardedFor || req.ip || req.socket.remoteAddress || "ip_desconocida",
      )
        .split(",")[0]
        .trim();

  const userAgent = (
    req.headers["user-agent"] || "Dispositivo_Desconocido"
  ).trim();

  return Buffer.from(`${ip}-${userAgent}`).toString("base64").substring(0, 120);
}

export class AuthController {
  static _frontendUrl(req) {
    const oauthUrl = req.oauthFrontendUrl?.trim();
    if (oauthUrl) return oauthUrl.replace(/\/+$/, "");

    const envUrl = process.env.FRONTEND_URL?.trim();
    if (envUrl) return envUrl.replace(/\/+$/, "");

    const origin = req.headers.origin?.trim();
    if (origin) return origin.replace(/\/+$/, "");

    const referer = req.headers.referer?.trim();
    if (referer) {
      try {
        return new URL(referer).origin.replace(/\/+$/, "");
      } catch {}
    }

    return "http://localhost:5173";
  }

  static async googleCallback(req, res) {
    const frontendUrl = AuthController._frontendUrl(req);

    try {
      const googleProfile = req.user;
      const dispositivoId = buildDeviceId(req);

      const { accessToken, refreshToken } =
        await AuthService.procesarLoginGoogle(googleProfile, dispositivoId);

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

      return res.redirect(
        `${frontendUrl}/dashboard?token=${encodeURIComponent(accessToken)}`,
      );
    } catch (error) {
      console.error("[AuthController googleCallback]:", error.message);
      const codigo = codigoDeError(error.message);

      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(codigo)}`,
      );
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

      return res.status(200).json({
        ok: true,
        accessToken: newAccessToken,
      });
    } catch (error) {
      console.error("[AuthController refreshToken]:", error.message);
      clearRefreshCookie(res);

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

      if (authHeader?.startsWith("Bearer ")) {
        try {
          const accessToken = authHeader.split(" ")[1];
          payload = accessFactory.verifyToken(accessToken, {
            ignoreExpiration: true,
          });
        } catch {}
      }

      if (!payload && req.cookies?.refreshToken) {
        try {
          payload = refreshFactory.verifyToken(req.cookies.refreshToken, {
            ignoreExpiration: true,
          });
        } catch {
          // Si tampoco sirve, igual limpiamos cookie localmente
        }
      }

      if (payload?.dispositivoId && payload?.id) {
        await AuthService.cerrarSesion(payload.dispositivoId, payload.id);
      }

      clearRefreshCookie(res);

      return res.status(200).json({
        ok: true,
        mensaje: "Sesión cerrada correctamente.",
      });
    } catch (error) {
      console.error("[AuthController logout]:", error.message);
      clearRefreshCookie(res);

      return res.status(200).json({
        ok: true,
        mensaje: "Sesión cerrada localmente.",
      });
    }
  }
}
