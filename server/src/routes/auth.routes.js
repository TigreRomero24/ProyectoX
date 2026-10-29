import { Router } from "express";
import passport from "../config/passport.js";
import {
  AuthController,
  REFRESH_COOKIE_OPTIONS,
} from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { UsuarioService } from "../services/usuario.service.js";
import { Usuario } from "../models/security.models/usuarioModel.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";
import {
  uploadPerfilImagen,
  buildPerfilPublicUrl,
  deletePerfilImageByUrl,
} from "../utils/mediaUpload.js";

const router = Router();

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function sanitizeFrontendUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    // Solo orígenes propios: evita redirigir el token a un dominio ajeno.
    return env.allowedOrigins.includes(url.origin) ? url.origin : null;
  } catch (_) {
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

router.get("/google", (req, res, next) => {
  const frontendUrl = resolveFrontendUrl(req);
  const state = Buffer.from(
    JSON.stringify({ frontendUrl }),
    "utf8",
  ).toString("base64url");

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    let frontendUrl = sanitizeFrontendUrl(process.env.FRONTEND_URL);
    const stateRaw = req.query.state;

    if (typeof stateRaw === "string" && stateRaw.length > 0) {
      try {
        const stateDecoded = JSON.parse(
          Buffer.from(stateRaw, "base64url").toString("utf8"),
        );
        frontendUrl = sanitizeFrontendUrl(stateDecoded?.frontendUrl) || frontendUrl;
      } catch (_) { }
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
  },
);

router.post("/refresh", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

// ── Perfil del usuario autenticado ────────────────────────────────────────────

router.get(
  "/me",
  AuthMiddleware.handle,
  SessionMiddleware.handle,
  async (req, res) => {
    try {
      const usuario = await Usuario.findByPk(req.user.id, {
        attributes: ["id_usuario", "correo_institucional", "nombre", "url_foto", "rol"],
      });

      if (!usuario) {
        return res.status(404).json({ ok: false, error: "Usuario no encontrado." });
      }

      return res.json({
        ok: true,
        data: {
          id: usuario.id_usuario,
          correo: usuario.correo_institucional,
          nombre: usuario.nombre,
          url_foto: usuario.url_foto,
          rol: usuario.rol,
        },
      });
    } catch (error) {
      console.error("[GET /me]:", error.message);
      return res.status(500).json({ ok: false, error: "Error al obtener perfil." });
    }
  },
);

router.put(
  "/me",
  AuthMiddleware.handle,
  SessionMiddleware.handle,
  uploadPerfilImagen,
  async (req, res) => {
    try {
      const usuario = await Usuario.findByPk(req.user.id);

      if (!usuario) {
        return res.status(404).json({ ok: false, error: "Usuario no encontrado." });
      }

      // Actualizar nombre si viene en el body
      if (typeof req.body.nombre === "string") {
        usuario.nombre = req.body.nombre.trim() || null;
      }

      // Actualizar foto si se subió un archivo
      if (req.file) {
        // Borrar la foto anterior si era local
        if (usuario.url_foto && usuario.url_foto.startsWith("/media/perfil/")) {
          await deletePerfilImageByUrl(usuario.url_foto);
        }
        usuario.url_foto = buildPerfilPublicUrl(req.file.filename);
      }

      await usuario.save();

      // Generar un nuevo access token con los datos actualizados
      const accessFactory = TokenFactory.create("ACCESS", env.jwt);
      const newAccessToken = accessFactory.generateToken({
        id: usuario.id_usuario,
        rol: usuario.rol,
        dispositivoId: req.user.dispositivoId,
        nombre: usuario.nombre || null,
        correo: usuario.correo_institucional,
        url_foto: usuario.url_foto || null,
      });

      return res.json({
        ok: true,
        mensaje: "Perfil actualizado correctamente.",
        accessToken: newAccessToken,
        data: {
          id: usuario.id_usuario,
          correo: usuario.correo_institucional,
          nombre: usuario.nombre,
          url_foto: usuario.url_foto,
          rol: usuario.rol,
        },
      });
    } catch (error) {
      console.error("[PUT /me]:", error.message);
      return res.status(500).json({ ok: false, error: "Error al actualizar perfil." });
    }
  },
);

export default router;

