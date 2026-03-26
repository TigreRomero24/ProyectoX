import { Usuario } from "../models/security.models/usuarioModel.js";
import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";
import { sequelize } from "../config/database.js";
import argon2 from "argon2";
import { parseDuration } from "../utils/duration.js";

const accessFactory = TokenFactory.create("ACCESS", env.jwt);
const refreshFactory = TokenFactory.create("REFRESH", env.jwt);
const REFRESH_DURATION_MS = parseDuration(env.jwt.refreshExpiresIn);
const USUARIO_MIN_ATTRIBUTES = ["id_usuario", "rol", "activo"];

export class AuthService {
  static refreshLocks = new Map();

  static _extraerDatosGoogle(googleProfile) {
    if (!googleProfile || typeof googleProfile !== "object") {
      throw new Error("VALIDACION: Perfil de Google inválido o no recibido.");
    }

    const correo = googleProfile.email || googleProfile.emails?.[0]?.value;
    const googleId = googleProfile.sub || googleProfile.id;

    if (!correo || !googleId) {
      throw new Error(
        "VALIDACION: El perfil de Google no contiene correo o ID.",
      );
    }

    return { correo: correo.toLowerCase(), googleId };
  }

  static async procesarLoginGoogle(googleProfile, dispositivoId) {
    if (!dispositivoId || typeof dispositivoId !== "string") {
      throw new Error("VALIDACION: Identificador de dispositivo inválido.");
    }

    const { correo, googleId } = this._extraerDatosGoogle(googleProfile);

    if (!correo.endsWith("@unemi.edu.ec")) {
      throw new Error(
        "ACCESO_DENEGADO: Solo se permiten cuentas institucionales.",
      );
    }

    const t = await sequelize.transaction();

    try {
      const usuario = await Usuario.findOne({
        where: { correo_institucional: correo },
        transaction: t,
      });

      if (!usuario)
        throw new Error("USUARIO_NO_REGISTRADO: Contacte al administrador.");

      if (usuario.activo === false)
        throw new Error("USUARIO_INACTIVO: Cuenta deshabilitada.");

      if (!usuario.google_id) {
        usuario.google_id = googleId;
        await usuario.save({ transaction: t });
      }

      const accessToken = accessFactory.generateToken({
        id: usuario.id_usuario,
        rol: usuario.rol,
        dispositivoId: dispositivoId,
      });

      const refreshToken = refreshFactory.generateToken({
        id: usuario.id_usuario,
        dispositivoId: dispositivoId,
        version: 1,
      });

      const hashedRefresh = await argon2.hash(refreshToken, {
        type: argon2.argon2id,
      });

      const expiracionRefresh = new Date(Date.now() + REFRESH_DURATION_MS);

      let sesion = await SesionDispositivo.findOne({
        where: {
          dispositivo_id: dispositivoId,
          id_usuario: usuario.id_usuario,
        },
        transaction: t,
      });

      if (sesion) {
        sesion.expiracion_refresh = expiracionRefresh;
        sesion.refresh_token_hash = hashedRefresh;
        await sesion.save({ transaction: t });
      } else {
        const limite =
          usuario.limite_dispositivos > 0 ? usuario.limite_dispositivos : 3;

        const sesionesActivas = await SesionDispositivo.count({
          where: { id_usuario: usuario.id_usuario },
          transaction: t,
        });

        if (sesionesActivas >= limite) {
          throw new Error("ACCESO_DENEGADO: Límite de dispositivos alcanzado.");
        }

        sesion = await SesionDispositivo.create(
          {
            id_usuario: usuario.id_usuario,
            dispositivo_id: dispositivoId,
            refresh_token_hash: hashedRefresh,
            expiracion_refresh: expiracionRefresh,
          },
          { transaction: t },
        );
      }

      await t.commit();

      return {
        accessToken,
        refreshToken,
        usuario: {
          id: usuario.id_usuario,
          correo: usuario.correo_institucional,
          rol: usuario.rol,
        },
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async cerrarSesion(dispositivoId, id_usuario) {
    if (!dispositivoId || !id_usuario)
      throw new Error("VALIDACION: Datos incompletos para cerrar sesión.");

    await SesionDispositivo.destroy({
      where: { dispositivo_id: dispositivoId, id_usuario },
    });
  }

  static async renovarToken(refreshTokenCrudo) {
    if (!refreshTokenCrudo)
      throw new Error("VALIDACION: Refresh token no proporcionado.");

    let payload;
    try {
      payload = refreshFactory.verifyToken(refreshTokenCrudo);
    } catch (error) {
      console.error(
        "[AuthService renovarToken] verifyToken falló:",
        error.message,
      );
      throw new Error(
        "TOKEN_INVALIDO: El refresh token ha expirado o está corrupto.",
      );
    }

    const lockKey = `${payload.id}:${payload.dispositivoId}`;

    if (this.refreshLocks.has(lockKey)) {
      return this.refreshLocks.get(lockKey);
    }

    const inFlight = this._renovarTokenConControl(
      refreshTokenCrudo,
      payload,
    ).finally(() => {
      if (this.refreshLocks.get(lockKey) === inFlight) {
        this.refreshLocks.delete(lockKey);
      }
    });

    this.refreshLocks.set(lockKey, inFlight);

    return inFlight;
  }

  static async _renovarTokenConControl(refreshTokenCrudo, payload) {
    const t = await sequelize.transaction();

    try {
      const sesion = await SesionDispositivo.findOne({
        attributes: [
          "id_sesion",
          "id_usuario",
          "dispositivo_id",
          "refresh_token_hash",
          "expiracion_refresh",
        ],
        where: {
          id_usuario: payload.id,
          dispositivo_id: payload.dispositivoId,
        },
        include: [
          {
            model: Usuario,
            as: "propietario",
            attributes: USUARIO_MIN_ATTRIBUTES,
            required: false,
          },
        ],
        transaction: t,
      });

      if (!sesion)
        throw new Error("SESION_NO_ENCONTRADA: La sesión ha sido cerrada.");

      if (sesion.expiracion_refresh < new Date()) {
        await SesionDispositivo.destroy({
          where: { id_sesion: sesion.id_sesion },
          transaction: t,
        });
        throw new Error("SESION_NO_ENCONTRADA: La sesión ha expirado.");
      }

      const usuario =
        sesion.propietario ||
        (await Usuario.findByPk(sesion.id_usuario, {
          attributes: USUARIO_MIN_ATTRIBUTES,
          transaction: t,
        }));

      if (!usuario || usuario.activo === false)
        throw new Error("USUARIO_INACTIVO: El usuario ha sido desactivado.");

      const isValid = await argon2.verify(
        sesion.refresh_token_hash,
        refreshTokenCrudo,
      );

      if (!isValid) {
        await SesionDispositivo.destroy({
          where: { id_sesion: sesion.id_sesion },
          transaction: t,
        });
        throw new Error(
          "TOKEN_INVALIDO: Intento de reutilización detectado. Sesión revocada.",
        );
      }

      const newAccessToken = accessFactory.generateToken({
        id: usuario.id_usuario,
        rol: usuario.rol,
        dispositivoId: sesion.dispositivo_id,
      });

      const newRefreshToken = refreshFactory.generateToken({
        id: usuario.id_usuario,
        dispositivoId: sesion.dispositivo_id,
        version: (payload.version || 0) + 1,
      });

      const hashedRefresh = await argon2.hash(newRefreshToken, {
        type: argon2.argon2id,
      });

      sesion.refresh_token_hash = hashedRefresh;
      sesion.expiracion_refresh = new Date(Date.now() + REFRESH_DURATION_MS);
      await sesion.save({ transaction: t });

      await t.commit();

      return { newAccessToken, newRefreshToken };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
