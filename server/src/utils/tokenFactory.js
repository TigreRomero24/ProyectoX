// server/src/utils/tokenFactory.js
import jwt from "jsonwebtoken";

class BaseTokenFactory {
  constructor(config) {
    if (this.constructor === BaseTokenFactory) {
      throw new Error("BaseTokenFactory es abstracta y no puede instanciarse");
    }

    if (!config.secret)
      throw new Error(`${this.constructor.name}: secret es obligatorio`);
    if (!config.expiresIn)
      throw new Error(`${this.constructor.name}: expiresIn es obligatorio`);
    if (!config.issuer)
      throw new Error(`${this.constructor.name}: issuer es obligatorio`);
    if (!config.audience)
      throw new Error(`${this.constructor.name}: audience es obligatorio`);
    if (!config.algorithm)
      throw new Error(`${this.constructor.name}: algorithm es obligatorio`);

    this.secret = config.secret;
    this.expiresIn = config.expiresIn;
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.algorithm = config.algorithm;
  }

  generateToken(payload) {
    throw new Error(`${this.constructor.name} debe implementar generateToken`);
  }
  verifyToken(token, options = {}) {
    throw new Error(`${this.constructor.name} debe implementar verifyToken`);
  }
}

/**
 * ====================================================================
 * ACCESS TOKEN FACTORY
 * ====================================================================
 */
export class AccessTokenFactory extends BaseTokenFactory {
  constructor(config) {
    super(config);
  }

  generateToken(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("AccessTokenFactory: payload debe ser un objeto");
    }

    // Adaptado a la nueva arquitectura: id + dispositivoId
    if (!payload.id || !payload.rol || !payload.dispositivoId) {
      throw new Error(
        "AccessTokenFactory: payload debe contener id, rol y dispositivoId",
      );
    }

    const cleanPayload = {
      id: payload.id,
      rol: payload.rol,
      dispositivoId: payload.dispositivoId,
      tipo: "access",
    };

    return jwt.sign(cleanPayload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });
  }

  verifyToken(token, options = {}) {
    if (!token || typeof token !== "string") {
      throw new Error("ACCESS_TOKEN_MISSING");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [this.algorithm],
        ignoreExpiration: options.ignoreExpiration || false, // Permite decodificar tokens vencidos si se requiere (ej. Logout)
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("ACCESS_TOKEN_EXPIRED");
      }
      if (
        error instanceof jwt.JsonWebTokenError ||
        error instanceof jwt.NotBeforeError
      ) {
        console.error(
          `[ALERTA SEGURIDAD] Manipulación de Access Token: ${error.message}`,
        );
        throw new Error("ACCESS_TOKEN_INVALID");
      }
      throw new Error("ACCESS_TOKEN_VERIFICATION_FAILED");
    }

    // Validación fuera del try/catch de jsonwebtoken para no enmascarar errores
    if (!decoded.id || !decoded.rol || !decoded.dispositivoId) {
      throw new Error("ACCESS_TOKEN_MALFORMED");
    }

    return decoded;
  }
}

/**
 * ====================================================================
 * REFRESH TOKEN FACTORY
 * ====================================================================
 */
export class RefreshTokenFactory extends BaseTokenFactory {
  constructor(config) {
    super(config);
  }

  generateToken(payload) {
    // Adaptado a la nueva arquitectura
    if (!payload || !payload.id || !payload.dispositivoId) {
      throw new Error(
        "RefreshTokenFactory: payload debe contener id y dispositivoId",
      );
    }

    const cleanPayload = {
      id: payload.id,
      dispositivoId: payload.dispositivoId,
      version: payload.version || 1,
      tipo: "refresh",
    };

    return jwt.sign(cleanPayload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });
  }

  verifyToken(token, options = {}) {
    if (!token || typeof token !== "string") {
      throw new Error("REFRESH_TOKEN_MISSING");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [this.algorithm],
        ignoreExpiration: options.ignoreExpiration || false,
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("REFRESH_TOKEN_EXPIRED");
      }
      if (error instanceof jwt.JsonWebTokenError) {
        console.error(
          `[ALERTA SEGURIDAD] Manipulación de Refresh Token: ${error.message}`,
        );
        throw new Error("REFRESH_TOKEN_INVALID");
      }
      throw new Error("REFRESH_TOKEN_VERIFICATION_FAILED");
    }

    // Validación fuera del try/catch
    if (!decoded.id || !decoded.dispositivoId) {
      throw new Error("REFRESH_TOKEN_MALFORMED");
    }

    return decoded;
  }
}

/**
 * ====================================================================
 * TOKEN FACTORY PRINCIPAL (PUNTO DE ENTRADA)
 * ====================================================================
 */
export class TokenFactory {
  static TYPES = {
    ACCESS: "ACCESS",
    REFRESH: "REFRESH",
  };

  static create(type, jwtConfig) {
    const tokenType = type.toUpperCase();
    if (!Object.values(this.TYPES).includes(tokenType)) {
      throw new Error(`Tipo de token no soportado: ${type}`);
    }

    if (!jwtConfig) {
      throw new Error("TokenFactory: jwtConfig es obligatorio");
    }

    switch (tokenType) {
      case this.TYPES.ACCESS:
        return new AccessTokenFactory({
          secret: jwtConfig.accessSecret,
          expiresIn: jwtConfig.accessExpiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audiences.api,
          algorithm: jwtConfig.algorithm,
        });

      case this.TYPES.REFRESH:
        return new RefreshTokenFactory({
          secret: jwtConfig.refreshSecret,
          expiresIn: jwtConfig.refreshExpiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audiences.auth,
          algorithm: jwtConfig.algorithm,
        });

      default:
        throw new Error(`TokenFactory: ${tokenType} no implementado`);
    }
  }
}
