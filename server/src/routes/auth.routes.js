import { Router } from "express";
import passport from "../config/passport.js";
import {
  AuthController,
  REFRESH_COOKIE_OPTIONS,
} from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { UsuarioService } from "../services/usuario.service.js";

const router = Router();

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function sanitizeFrontendUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
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


export default router;
