// server/src/utils/tokenFactory.js
import jwt from "jsonwebtoken";

class BaseTokenFactory {
  constructor(config) {
    if (this.constructor === BaseTokenFactory) {
      throw new Error("BaseTokenFactory es abstracta.");
    }

    if (!config || typeof config !== "object" || Array.isArray(config)) {
      throw new Error(
        `[${this.constructor.name}] config debe ser un objeto válido.`,
      );
    }

    for (const campo of [
      "secret",
      "expiresIn",
      "issuer",
      "audience",
      "algorithm",
    ]) {
      if (typeof config[campo] !== "string" || config[campo].trim() === "") {
        throw new Error(
          `[${this.constructor.name}] "${campo}" debe ser un string no vacío. ` +
            `Verifica tu .env y environment.js`,
        );
      }
    }

    this.secret = config.secret;
    this.expiresIn = config.expiresIn;
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.algorithm = config.algorithm;
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
    if (!payload?.id || !payload?.rol || !payload?.dispositivoId) {
      throw new Error(
        "[AccessTokenFactory] generateToken requiere: { id, rol, dispositivoId }",
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
        ignoreExpiration: options.ignoreExpiration ?? false,
      });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        throw new Error("ACCESS_TOKEN_EXPIRED");
      if (err instanceof jwt.JsonWebTokenError)
        throw new Error("ACCESS_TOKEN_INVALID");
      if (err instanceof jwt.NotBeforeError)
        throw new Error("ACCESS_TOKEN_INVALID");
      throw new Error("ACCESS_TOKEN_VERIFICATION_FAILED");
    }

    if (!decoded.id || !decoded.rol || !decoded.dispositivoId) {
      throw new Error("ACCESS_TOKEN_MALFORMED");
    }

    if (decoded.tipo !== "access") {
      throw new Error("ACCESS_TOKEN_INVALID");
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
    if (!payload?.id || !payload?.dispositivoId) {
      throw new Error(
        "[RefreshTokenFactory] generateToken requiere: { id, dispositivoId }",
      );
    }

    const cleanPayload = {
      id: payload.id,
      dispositivoId: payload.dispositivoId,
      version: payload.version ?? 1,
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
        ignoreExpiration: options.ignoreExpiration ?? false,
      });
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError)
        throw new Error("REFRESH_TOKEN_EXPIRED");
      if (err instanceof jwt.JsonWebTokenError)
        throw new Error("REFRESH_TOKEN_INVALID");
      throw new Error("REFRESH_TOKEN_VERIFICATION_FAILED");
    }

    if (!decoded.id || !decoded.dispositivoId) {
      throw new Error("REFRESH_TOKEN_MALFORMED");
    }

    if (decoded.tipo !== "refresh") {
      throw new Error("REFRESH_TOKEN_INVALID");
    }

    return decoded;
  }
}

export class TokenFactory {
  static create(type, jwtConfig) {
    if (!jwtConfig) {
      throw new Error(
        "[TokenFactory] jwtConfig es obligatorio. Verifica env.jwt en environment.js",
      );
    }

    switch (type?.toUpperCase()) {
      case "ACCESS":
        return new AccessTokenFactory({
          secret: jwtConfig.accessSecret,
          expiresIn: jwtConfig.accessExpiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audiences.api,
          algorithm: jwtConfig.algorithm,
        });

      case "REFRESH":
        return new RefreshTokenFactory({
          secret: jwtConfig.refreshSecret,
          expiresIn: jwtConfig.refreshExpiresIn,
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audiences.auth,
          algorithm: jwtConfig.algorithm,
        });

      default:
        throw new Error(
          `[TokenFactory] Tipo no soportado: "${type}". Usa "ACCESS" o "REFRESH"`,
        );
    }
  }
}
