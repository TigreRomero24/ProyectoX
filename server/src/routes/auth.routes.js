import { Router } from "express";
import passport from "../config/passport.js";
import { AuthController } from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { UsuarioService } from "../services/usuario.service.js";
import { Usuario } from "../models/security.models/usuarioModel.js";
import { env } from "../config/environment.js";
import { parseDuration } from "../utils/duration.js";

const router = Router();

const DEFAULT_FRONTEND_URL = "http://localhost:5173";

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  maxAge: parseDuration(env.jwt.refreshExpiresIn),
  path: "/api/v1/auth/refresh",
};

function sanitizeFrontendUrl(raw) {
  if (!raw || typeof raw !== "string") return null;

  try {
    const url = new URL(raw.trim());

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function resolveFrontendUrl(req) {
  return (
    sanitizeFrontendUrl(req.query.frontend) ||
    sanitizeFrontendUrl(process.env.FRONTEND_URL) ||
    DEFAULT_FRONTEND_URL
  );
}

function buildDeviceId(req, fallbackLabel = "Dispositivo_Prueba") {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(
        forwardedFor || req.ip || req.socket.remoteAddress || "ip_desconocida",
      )
        .split(",")[0]
        .trim();

  const userAgent = (req.headers["user-agent"] || fallbackLabel).trim();

  return Buffer.from(`${ip}-${userAgent}`).toString("base64").substring(0, 120);
}

router.get("/google", (req, res, next) => {
  const frontendUrl = resolveFrontendUrl(req);

  const state = Buffer.from(JSON.stringify({ frontendUrl }), "utf8").toString(
    "base64url",
  );

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
    session: false,
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  let frontendUrl = sanitizeFrontendUrl(process.env.FRONTEND_URL);
  const stateRaw = req.query.state;

  if (typeof stateRaw === "string" && stateRaw.length > 0) {
    try {
      const stateDecoded = JSON.parse(
        Buffer.from(stateRaw, "base64url").toString("utf8"),
      );

      frontendUrl =
        sanitizeFrontendUrl(stateDecoded?.frontendUrl) || frontendUrl;
    } catch {
      // Si falla el parseo, usamos fallback seguro
    }
  }

  req.oauthFrontendUrl = frontendUrl || DEFAULT_FRONTEND_URL;

  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${req.oauthFrontendUrl}/login?error=google_auth_failed`,
      );
    }

    req.user = user;
    return AuthController.googleCallback(req, res, next);
  })(req, res, next);
});

router.post("/refresh", AuthController.refreshToken);
router.post("/logout", AuthController.logout);

/**
 * =========================================================================================
 * RUTAS TEMPORALES DE DESARROLLO
 * Se cargan solo fuera de producción para facilitar pruebas locales.
 * =========================================================================================
 */
if (!env.isProduction) {
  router.post("/crear-usuario", async (req, res) => {
    try {
      const nuevoUsuario = await UsuarioService.crearUsuario(req.body);

      return res.status(201).json({
        ok: true,
        mensaje: "Usuario de prueba creado exitosamente.",
        data: nuevoUsuario,
      });
    } catch (error) {
      console.error("[DEV crear-usuario]:", error.message);

      const status = error.message?.startsWith("VALIDACION")
        ? 400
        : error.message?.startsWith("DUPLICADO")
          ? 409
          : 500;

      return res.status(status).json({
        ok: false,
        error: error.message,
      });
    }
  });

  router.post("/login-directo", async (req, res) => {
    try {
      const { correo, rol } = req.body;

      if (typeof correo !== "string" || correo.trim() === "") {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El correo es requerido.",
        });
      }

      const correoNormalizado = correo.trim().toLowerCase();

      if (!correoNormalizado.endsWith("@unemi.edu.ec")) {
        return res.status(400).json({
          ok: false,
          error: "VALIDACION: El correo debe ser del dominio @unemi.edu.ec.",
        });
      }

      let usuario = await Usuario.findOne({
        where: { correo_institucional: correoNormalizado },
      });

      // Bootstrap temporal solo para admin en desarrollo
      if (!usuario && rol === "ADMINISTRADOR") {
        usuario = await Usuario.create({
          correo_institucional: correoNormalizado,
          rol: "ADMINISTRADOR",
          limite_dispositivos: 3,
          activo: true,
        });
      }

      if (!usuario) {
        return res.status(404).json({
          ok: false,
          error: "USUARIO_NO_REGISTRADO: El usuario no existe.",
        });
      }

      if (usuario.activo === false) {
        return res.status(403).json({
          ok: false,
          error: "USUARIO_INACTIVO: El usuario está desactivado.",
        });
      }

      const dispositivoId = buildDeviceId(req, "Dispositivo_Prueba");
      const fakeId = `test_id_${Date.now()}`;

      const fakeGoogleProfile = {
        id: fakeId,
        sub: fakeId,
        provider: "google",
        displayName: correoNormalizado.split("@")[0],
        email: correoNormalizado,
        emails: [{ value: correoNormalizado, verified: true }],
        _json: {
          sub: fakeId,
          email: correoNormalizado,
          email_verified: true,
          hd: "unemi.edu.ec",
        },
      };

      const {
        accessToken,
        refreshToken,
        usuario: usuarioLogueado,
      } = await AuthService.procesarLoginGoogle(
        fakeGoogleProfile,
        dispositivoId,
      );

      res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

      return res.status(200).json({
        ok: true,
        accessToken,
        usuario: usuarioLogueado,
      });
    } catch (error) {
      console.error("[DEV login-directo]:", error.message);

      const status = error.message?.startsWith("USUARIO_NO_REGISTRADO")
        ? 404
        : error.message?.startsWith("USUARIO_INACTIVO") ||
            error.message?.startsWith("ACCESO_DENEGADO")
          ? 403
          : error.message?.startsWith("VALIDACION")
            ? 400
            : error.message?.startsWith("DUPLICADO")
              ? 409
              : 500;

      return res.status(status).json({
        ok: false,
        error: error.message,
      });
    }
  });
}

export default router;
