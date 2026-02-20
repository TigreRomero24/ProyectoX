/**
 * ====================================================================
 * RUTAS DE AUTENTICACIÓN - EDUQUERY (SOPORTE GOOGLE + LOCAL)
 * ====================================================================
 */

import { Router } from "express";
import argon2 from "argon2";
import {
  Usuario,
  Dispositivo,
  LogSeguridad,
} from "../models/relacionesModel.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";
import passport from "../config/passport.js";

// ====================================================================
// IMPORTACIÓN DE MIDDLEWARES
// ====================================================================
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { dispositivoMiddleware } from "../middlewares/dispositivoMiddleware.js";

const router = Router();

// ====================================================================
// 🔧 INSTANCIAR FÁBRICAS DE TOKENS
// ====================================================================
const accessTokenFactory = TokenFactory.create("ACCESS", env.jwt);
const refreshTokenFactory = TokenFactory.create("REFRESH", env.jwt);

if (!accessTokenFactory || !refreshTokenFactory) {
  console.error("🔴 ERROR FATAL: TokenFactory no devolvió las instancias.");
  process.exit(1);
}

// ====================================================================
// 🌐 FLUJO GOOGLE OAUTH 2.0
// ====================================================================

// 1. Iniciar autenticación con Google
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }),
);

// 2. Callback de Google (Retorno)
router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      "http://localhost:5173/login?error=correo_no_institucional",
  }),
  async (req, res) => {
    try {
      const usuario = req.user;
      const userIp =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;

      const accessToken = accessTokenFactory.generateToken({
        id: usuario.id_usuario,
        rol: usuario.rol,
        dispositivoId: "PENDIENTE_VINCULACION",
      });

      const refreshToken = refreshTokenFactory.generateToken({
        id: usuario.id_usuario,
      });

      const expiracion = new Date();
      expiracion.setMinutes(expiracion.getMinutes() + 15);

      await usuario.update({
        token_sesion_actual: accessToken,
        token_expiracion: expiracion,
      });

      await LogSeguridad.create({
        id_usuario: usuario.id_usuario,
        ip_origen: userIp,
        accion: "LOGIN_GOOGLE_EXITOSO",
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/auth/refresh",
      });

      res.redirect(`http://localhost:5173/dashboard?token=${accessToken}`);
    } catch (error) {
      console.error("Error crítico en callback de Google:", error);
      res.redirect("http://localhost:5173/login?error=internal_server_error");
    }
  },
);

// ====================================================================
// 1. REGISTRO DE USUARIO - PÚBLICO
// ====================================================================
router.post("/usuarios", authMiddleware, async (req, res) => {
  try {
    if (req.usuario.rol !== "ADMINISTRADOR") {
      return res.status(403).json({
        ok: false,
        mensaje: "Solo administradores pueden crear usuarios.",
      });
    }

    const { correo_institucional, password, rol, metodo_auth } = req.body;

    // VALIDACIÓN: Solo permitir creación de usuarios institucionales
    if (!correo_institucional.endsWith("@unemi.edu.ec")) {
      return res.status(400).json({
        ok: false,
        mensaje: "El correo no es permitido. Debe ser una cuenta @unemi.edu.ec",
      });
    }

    let hashedPassword = null;

    if (metodo_auth === "LOCAL") {
      if (!password) {
        return res.status(400).json({
          ok: false,
          mensaje: "La contraseña es requerida para acceso local.",
        });
      }
      hashedPassword = await argon2.hash(password, { type: argon2.argon2id });
    }

    const nuevoUsuario = await Usuario.create({
      correo_institucional,
      password: hashedPassword,
      rol: rol || "ESTUDIANTE",
      metodo_auth: metodo_auth || "LOCAL",
      activo: true,
    });

    const usuarioResponse = nuevoUsuario.toJSON();
    delete usuarioResponse.password;

    await LogSeguridad.create({
      id_usuario: nuevoUsuario.id_usuario,
      ip_origen: req.ip,
      accion: "USUARIO_CREADO_POR_ADMIN",
    });

    return res
      .status(201)
      .json({ ok: true, mensaje: "Usuario creado", usuario: usuarioResponse });
  } catch (error) {
    console.error("Error en registro:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res
        .status(409)
        .json({ ok: false, mensaje: "El correo ya está registrado." });
    }
    return res.status(500).json({ ok: false, mensaje: "Error interno." });
  }
});

// ====================================================================
// 2. LOGIN - PÚBLICO
// ====================================================================
router.post("/login", async (req, res) => {
  try {
    const { correo_institucional, password, huella_dispositivo } = req.body;

    // Rechazar correos no institucionales inmediatamente
    if (
      correo_institucional &&
      !correo_institucional.endsWith("@unemi.edu.ec")
    ) {
      return res.status(400).json({
        ok: false,
        codigo: "CORREO_NO_PERMITIDO",
        mensaje: "El correo no es permitido. Debe ser una cuenta @unemi.edu.ec",
      });
    }

    const userIp =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;

    if (!correo_institucional || !password || !huella_dispositivo) {
      return res.status(400).json({
        ok: false,
        codigo: "DATOS_INCOMPLETOS",
        mensaje: "Datos incompletos.",
      });
    }

    const usuario = await Usuario.findOne({
      where: { correo_institucional, activo: true },
    });

    if (!usuario) {
      return res.status(401).json({
        ok: false,
        codigo: "CREDENCIALES_INVALIDAS",
        mensaje: "Credenciales inválidas",
      });
    }

    if (usuario.metodo_auth === "GOOGLE" && !usuario.password) {
      return res.status(401).json({
        ok: false,
        codigo: "LOGIN_CON_GOOGLE_REQUERIDO",
        mensaje:
          "Esta cuenta fue registrada con Google. Por favor, usa el botón de 'Ingresar con Google'.",
      });
    }

    let validPassword = false;
    try {
      validPassword = await argon2.verify(usuario.password, password);
    } catch (e) {
      validPassword = false;
    }

    if (!validPassword) {
      await LogSeguridad.create({
        id_usuario: usuario.id_usuario,
        ip_origen: userIp,
        accion: "LOGIN_FALLIDO",
      });
      return res.status(401).json({
        ok: false,
        codigo: "CREDENCIALES_INVALIDAS",
        mensaje: "Credenciales inválidas",
      });
    }

    let dispositivo = await Dispositivo.findOne({
      where: { id_usuario: usuario.id_usuario },
    });

    if (dispositivo) {
      if (dispositivo.huella_hash !== huella_dispositivo) {
        await LogSeguridad.create({
          id_usuario: usuario.id_usuario,
          ip_origen: userIp,
          accion: "BLOQUEO_DISPOSITIVO",
        });
        return res.status(403).json({
          ok: false,
          codigo: "DISPOSITIVO_NO_AUTORIZADO",
          mensaje: "Dispositivo no autorizado.",
        });
      }
    } else {
      dispositivo = await Dispositivo.create({
        id_usuario: usuario.id_usuario,
        huella_hash: huella_dispositivo,
      });
      await LogSeguridad.create({
        id_usuario: usuario.id_usuario,
        ip_origen: userIp,
        accion: "DISPOSITIVO_REGISTRADO",
      });
    }

    const accessToken = accessTokenFactory.generateToken({
      id: usuario.id_usuario,
      rol: usuario.rol,
      dispositivoId: dispositivo.huella_hash,
    });

    const refreshToken = refreshTokenFactory.generateToken({
      id: usuario.id_usuario,
    });

    const expiracion = new Date();
    expiracion.setMinutes(expiracion.getMinutes() + 15);

    await usuario.update({
      token_sesion_actual: accessToken,
      token_expiracion: expiracion,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/auth/refresh",
    });

    await LogSeguridad.create({
      id_usuario: usuario.id_usuario,
      ip_origen: userIp,
      accion: "LOGIN_EXITOSO",
    });

    return res.status(200).json({
      ok: true,
      mensaje: "Login exitoso",
      accessToken: accessToken,
      expira_en: "15m",
      usuario: {
        id: usuario.id_usuario,
        correo: usuario.correo_institucional,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error crítico en login:", error);
    return res.status(500).json({
      ok: false,
      codigo: "ERROR_INTERNO",
      mensaje: "Error en autenticación",
    });
  }
});

// ====================================================================
// 3. REFRESH TOKEN
// ====================================================================
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken)
      return res.status(401).json({ ok: false, codigo: "REFRESH_REQUERIDO" });

    let payload;
    try {
      payload = refreshTokenFactory.verifyToken(refreshToken);
    } catch (e) {
      res.clearCookie("refreshToken", { path: "/auth/refresh" });
      return res.status(401).json({ ok: false, codigo: "REFRESH_INVALIDO" });
    }

    const usuario = await Usuario.findOne({
      where: { id_usuario: payload.id, activo: true },
    });
    if (!usuario)
      return res.status(401).json({ ok: false, codigo: "USUARIO_NO_EXISTE" });

    const dispositivo = await Dispositivo.findOne({
      where: { id_usuario: usuario.id_usuario },
    });
    if (!dispositivo)
      return res.status(403).json({ ok: false, codigo: "SIN_DISPOSITIVO" });

    const newAccessToken = accessTokenFactory.generateToken({
      id: usuario.id_usuario,
      rol: usuario.rol,
      dispositivoId: dispositivo.huella_hash,
    });
    const newRefreshToken = refreshTokenFactory.generateToken({
      id: usuario.id_usuario,
    });

    await usuario.update({
      token_sesion_actual: newAccessToken,
      token_expiracion: new Date(Date.now() + 15 * 60000),
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "strict",
      path: "/auth/refresh",
    });

    return res.status(200).json({ ok: true, accessToken: newAccessToken });
  } catch (error) {
    console.error("Error en refresh:", error);
    return res.status(500).json({ ok: false, codigo: "ERROR_INTERNO" });
  }
});

// ====================================================================
// 4. LOGOUT
// ====================================================================
router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    try {
      const payload = refreshTokenFactory.verifyToken(refreshToken);
      await Usuario.update(
        { token_sesion_actual: null, token_expiracion: null },
        { where: { id_usuario: payload.id } },
      );
      await LogSeguridad.create({
        id_usuario: payload.id,
        ip_origen: req.ip,
        accion: "LOGOUT",
      });
    } catch (e) {}
  }
  res.clearCookie("refreshToken", { path: "/auth/refresh" });
  return res.status(200).json({ ok: true, mensaje: "Sesión cerrada" });
});

// ====================================================================
// 5. RUTAS PROTEGIDAS (Admin & Perfil)
// ====================================================================

// Listar Usuarios
router.get(
  "/usuarios",
  authMiddleware,
  dispositivoMiddleware,
  async (req, res) => {
    try {
      if (req.usuario.rol !== "ADMINISTRADOR") {
        return res.status(403).json({ ok: false, codigo: "ACCESO_DENEGADO" });
      }

      const usuarios = await Usuario.findAll({
        attributes: [
          "id_usuario",
          "correo_institucional",
          "rol",
          "activo",
          "metodo_auth",
        ],
        order: [["id_usuario", "ASC"]],
      });

      return res.json({ ok: true, data: usuarios });
    } catch (error) {
      console.error("🔴 Error exacto de Base de Datos:", error.message);
      return res.status(500).json({
        ok: false,
        mensaje: "Error consultando usuarios",
        detalle: error.message,
      });
    }
  },
);

// Eliminar Usuario
router.delete(
  "/usuarios/:id",
  authMiddleware,
  dispositivoMiddleware,
  async (req, res) => {
    if (req.usuario.rol !== "ADMINISTRADOR")
      return res.status(403).json({ ok: false, codigo: "ACCESO_DENEGADO" });
    await Usuario.destroy({ where: { id_usuario: req.params.id } });
    res.json({ ok: true, mensaje: "Usuario eliminado" });
  },
);

// Editar Usuario
router.put(
  "/usuarios/:id",
  authMiddleware,
  dispositivoMiddleware,
  async (req, res) => {
    try {
      if (req.usuario.rol !== "ADMINISTRADOR") {
        return res.status(403).json({ ok: false, mensaje: "ACCESO_DENEGADO" });
      }

      const userId = req.params.id;
      const { rol } = req.body;

      const usuarioEditar = await Usuario.findByPk(userId);
      if (!usuarioEditar) {
        return res
          .status(404)
          .json({ ok: false, mensaje: "Usuario no encontrado." });
      }

      await usuarioEditar.update({
        rol: rol || usuarioEditar.rol,
      });

      res.json({ ok: true, mensaje: "Usuario actualizado correctamente" });
    } catch (error) {
      console.error("Error actualizando usuario:", error);
      res
        .status(500)
        .json({ ok: false, mensaje: "Error interno del servidor" });
    }
  },
);

// Perfil
router.get(
  "/perfil",
  authMiddleware,
  dispositivoMiddleware,
  async (req, res) => {
    res.json({
      ok: true,
      usuario: {
        id: req.usuario.id_usuario,
        correo: req.usuario.correo_institucional,
        rol: req.usuario.rol,
        dispositivo: req.usuario.dispositivo,
      },
    });
  },
);

// ====================================================================
// 6. VINCULAR DISPOSITIVO (Post-Google Login)
// ====================================================================
router.post("/dispositivo/vincular", authMiddleware, async (req, res) => {
  try {
    const { huella_dispositivo } = req.body;
    const userIp =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
    const usuarioId = req.usuario.id_usuario;

    if (!huella_dispositivo) {
      return res.status(400).json({ ok: false, mensaje: "Huella requerida" });
    }

    let dispositivo = await Dispositivo.findOne({
      where: { id_usuario: usuarioId, huella_hash: huella_dispositivo },
    });

    if (!dispositivo) {
      const total = await Dispositivo.count({
        where: { id_usuario: usuarioId },
      });
      if (total >= 3) {
        return res.status(403).json({
          ok: false,
          mensaje: "Límite de 3 dispositivos alcanzado. Contacta a soporte.",
        });
      }

      dispositivo = await Dispositivo.create({
        id_usuario: usuarioId,
        huella_hash: huella_dispositivo,
      });
    }

    const nuevoAccessToken = accessTokenFactory.generateToken({
      id: usuarioId,
      rol: req.usuario.rol,
      dispositivoId: dispositivo.huella_hash,
    });

    await Usuario.update(
      { token_sesion_actual: nuevoAccessToken },
      { where: { id_usuario: usuarioId } },
    );

    return res.status(200).json({
      ok: true,
      accessToken: nuevoAccessToken,
      usuario: {
        id: usuarioId,
        correo: req.usuario.correo_institucional,
        rol: req.usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en vinculación:", error);
    res.status(500).json({ ok: false, mensaje: "Error interno" });
  }
});

export default router;
