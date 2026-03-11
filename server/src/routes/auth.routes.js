import { Router } from "express";
import passport from "../config/passport.js";
import {
  AuthController,
  REFRESH_COOKIE_OPTIONS,
} from "../controllers/auth.controller.js";
import { AuthService } from "../services/auth.service.js";
import { UsuarioService } from "../services/usuario.service.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=autenticacion_rechazada`,
  }),
  AuthController.googleCallback,
);

router.post("/refresh", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

/**
 * =========================================================================================
 * ⚠️ INICIO BLOQUE DE PRUEBAS - ELIMINAR COMPLETAMENTE ANTES DE DESPLEGAR A PRODUCCIÓN ⚠️
 * =========================================================================================
 * Instrucciones para Producción:
 * Borrar desde aquí hasta el comentario "FIN BLOQUE DE PRUEBAS".
 * Estas rutas son un riesgo de seguridad severo si se exponen al público.
 */

// 5. MOCK: CREAR USUARIO DIRECTAMENTE (Usa la misma lógica estricta que producción)
router.post("/crear-usuario", async (req, res) => {
  try {
    // Delegamos toda la lógica (dominio, duplicados, etc.) al servicio principal.
    // Si necesitas un límite de dispositivos distinto, pásalo en el req.body.
    const nuevoUsuario = await UsuarioService.crearUsuario(req.body);

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario de prueba creado exitosamente",
      data: nuevoUsuario,
    });
  } catch (error) {
    console.error("[TEST crear-usuario]:", error.message);

    // Devolvemos el mismo formato de error que el controlador real
    const status = error.message.includes("VALIDACION")
      ? 400
      : error.message.includes("DUPLICADO")
        ? 409
        : 500;

    return res.status(status).json({ ok: false, error: error.message });
  }
});

// 6. MOCK: LOGIN DIRECTO (Bypass de Google OAuth para Postman/Frontend)
router.post("/login-directo", async (req, res) => {
  try {
    const { correo } = req.body;

    if (!correo) {
      return res.status(400).json({ ok: false, error: "Correo requerido" });
    }

    // 1. Simulamos el payload que entregaría Passport/Google
    const fakeGoogleProfile = {
      email: correo,
      id: `test_id_${Date.now()}`, // Un ID falso para simular la vinculación
    };

    // 2. Generamos la huella del dispositivo
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
    const userAgent = req.headers["user-agent"] || "Dispositivo_Prueba";
    const dispositivoId = Buffer.from(`${ip}-${userAgent}`)
      .toString("base64")
      .substring(0, 50);

    // 3. Delegamos el proceso al servicio real.
    // NOTA: Si el usuario no existe o está inactivo, el servicio lanzará el error correcto.
    // Ya no hacemos creaciones ni reactivaciones silenciosas por seguridad.
    const { accessToken, refreshToken, usuario } =
      await AuthService.procesarLoginGoogle(fakeGoogleProfile, dispositivoId);

    // 4. Inyectamos la cookie usando exactamente la misma configuración (DRY)
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(200).json({
      ok: true,
      accessToken,
      usuario,
    });
  } catch (error) {
    console.error("[TEST login-directo]:", error.message);

    const status = error.message.includes("NO_REGISTRADO")
      ? 404
      : error.message.includes("INACTIVO")
        ? 403
        : error.message.includes("DENEGADO")
          ? 403
          : 500;

    return res.status(status).json({ ok: false, error: error.message });
  }
});

/**
 * =========================================================================================
 * ⚠️ FIN BLOQUE DE PRUEBAS ⚠️
 * =========================================================================================
 */

export default router;
