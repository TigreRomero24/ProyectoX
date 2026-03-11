import { Usuario } from "../models/security.models/usuarioModel.js";
import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { env } from "../config/environment.js";
import { sequelize } from "../config/database.js";
import argon2 from "argon2";

/**
 * @class AuthService
 */
export class AuthService {
  static _extraerDatosGoogle(googleProfile) {
    const correo =
      googleProfile.email ||
      (googleProfile.emails && googleProfile.emails[0]?.value);
    const googleId = googleProfile.sub || googleProfile.id;

    if (!correo || !googleId) {
      throw new Error(
        "VALIDACION: El perfil de Google no contiene correo o ID.",
      );
    }
    return { correo: correo.toLowerCase(), googleId };
  }

  /**
   * @method procesarLoginGoogle
   */
  static async procesarLoginGoogle(googleProfile, dispositivoId) {
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
      if (!usuario.activo)
        throw new Error("USUARIO_INACTIVO: Cuenta deshabilitada.");

      if (!usuario.google_id) {
        usuario.google_id = googleId;
        await usuario.save({ transaction: t });
      }

      const accessFactory = TokenFactory.create("ACCESS", env.jwt);
      const refreshFactory = TokenFactory.create("REFRESH", env.jwt);

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

      let sesion = await SesionDispositivo.findOne({
        where: {
          dispositivo_id: dispositivoId,
          id_usuario: usuario.id_usuario,
        },
        transaction: t,
      });

      if (sesion) {
        sesion.ultima_actividad = new Date();
        sesion.expiracion_refresh = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        sesion.refresh_token_hash = hashedRefresh;
        await sesion.save({ transaction: t });
      } else {
        const sesionesPrevias = await SesionDispositivo.findAll({
          where: { id_usuario: usuario.id_usuario },
          order: [["ultima_actividad", "ASC"]],
          transaction: t,
        });

        if (sesionesPrevias.length >= usuario.limite_dispositivos) {
          const sesionesABorrar =
            sesionesPrevias.length - usuario.limite_dispositivos + 1;
          const idsABorrar = sesionesPrevias
            .slice(0, sesionesABorrar)
            .map((s) => s.id_sesion);
          await SesionDispositivo.destroy({
            where: { id_sesion: idsABorrar },
            transaction: t,
          });
        }

        sesion = await SesionDispositivo.create(
          {
            id_usuario: usuario.id_usuario,
            dispositivo_id: dispositivoId,
            ultima_actividad: new Date(),
            refresh_token_hash: hashedRefresh,
            expiracion_refresh: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

  /**
   * @method cerrarSesion
   */
  static async cerrarSesion(dispositivoId, id_usuario) {
    if (!dispositivoId || !id_usuario)
      throw new Error("VALIDACION: Datos incompletos para cerrar sesión.");

    await SesionDispositivo.destroy({
      where: { dispositivo_id: dispositivoId, id_usuario: id_usuario },
    });
  }

  /**
   * @method renovarToken
   */
  static async renovarToken(refreshTokenCrudo) {
    if (!refreshTokenCrudo)
      throw new Error("VALIDACION: Refresh token no proporcionado.");

    const refreshFactory = TokenFactory.create("REFRESH", env.jwt);
    let payload;

    try {
      payload = refreshFactory.verifyToken(refreshTokenCrudo);
    } catch (error) {
      throw new Error(
        "TOKEN_INVALIDO: El refresh token ha expirado o está corrupto.",
      );
    }

    const t = await sequelize.transaction();

    try {
      const sesion = await SesionDispositivo.findOne({
        where: {
          id_usuario: payload.id,
          dispositivo_id: payload.dispositivoId,
        },
        // FIX: "usuario" → "propietario" para coincidir con relacionesModel.js y sessionMiddleware.js
        include: [{ model: Usuario, as: "propietario" }],
        transaction: t,
      });

      if (!sesion)
        throw new Error("SESION_NO_ENCONTRADA: La sesión ha sido cerrada.");

      // FIX: sesion.usuario → sesion.propietario
      const usuario =
        sesion.propietario ||
        (await Usuario.findByPk(sesion.id_usuario, { transaction: t }));

      if (!usuario || !usuario.activo)
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
          "TOKEN_INVALIDO: Intento de reutilización de token detectado. Sesión revocada.",
        );
      }

      const accessFactory = TokenFactory.create("ACCESS", env.jwt);
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
      sesion.ultima_actividad = new Date();
      sesion.expiracion_refresh = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
      await sesion.save({ transaction: t });

      await t.commit();

      return { newAccessToken, newRefreshToken };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
