// server/src/utils/tokenFactory.js
/**
 * ====================================================================
 * TOKEN FACTORY - SISTEMA DE GESTIÓN DE JWT
 * ====================================================================
 *
 * ARQUITECTURA:
 * - Clase base abstracta (no instanciable)
 * - AccessTokenFactory: Tokens de corta duración para API
 * - RefreshTokenFactory: Tokens de larga duración para renovar sesión
 * - TokenFactory: Punto de entrada único (Factory Pattern)
 *
 * SEGURIDAD:
 * - Payload mínimo (solo datos necesarios)
 * - Validación estricta de tipos y campos
 * - Manejo específico de errores por tipo
 * - Issuer/Audience para evitar reuso entre servicios
 * - No incluye información sensible
 * ====================================================================
 */

import jwt from "jsonwebtoken";

/**
 * ====================================================================
 * CLASE BASE ABSTRACTIA
 * ====================================================================
 * Define el contrato que todas las fábricas deben cumplir.
 * No puede ser instanciada directamente.
 */
class BaseTokenFactory {
  /**
   * @param {Object} config - Configuración específica del token
   * @param {string} config.secret - Secreto para firmar
   * @param {string} config.expiresIn - Tiempo de expiración (15m, 7d, etc)
   * @param {string} config.issuer - Emisor del token (EduQuery)
   * @param {string} config.audience - Audiencia específica (API o Auth)
   * @param {string} config.algorithm - Algoritmo (HS256)
   */
  constructor(config) {
    // Previene instanciación directa de la clase base
    if (this.constructor === BaseTokenFactory) {
      throw new Error("BaseTokenFactory es abstracta y no puede instanciarse");
    }

    // Validaciones de configuración (Fail Fast)
    if (!config.secret) {
      throw new Error(`${this.constructor.name}: secret es obligatorio`);
    }
    if (!config.expiresIn) {
      throw new Error(`${this.constructor.name}: expiresIn es obligatorio`);
    }
    if (!config.issuer) {
      throw new Error(`${this.constructor.name}: issuer es obligatorio`);
    }
    if (!config.audience) {
      throw new Error(`${this.constructor.name}: audience es obligatorio`);
    }
    if (!config.algorithm) {
      throw new Error(`${this.constructor.name}: algorithm es obligatorio`);
    }

    this.secret = config.secret;
    this.expiresIn = config.expiresIn;
    this.issuer = config.issuer;
    this.audience = config.audience;
    this.algorithm = config.algorithm;
  }

  /**
   * Método abstracto para generar token
   * @param {Object} payload - Datos a incluir en el token
   */
  generateToken(payload) {
    throw new Error(`${this.constructor.name} debe implementar generateToken`);
  }

  /**
   * Método abstracto para verificar token
   * @param {string} token - Token a verificar
   */
  verifyToken(token) {
    throw new Error(`${this.constructor.name} debe implementar verifyToken`);
  }
}

/**
 * ====================================================================
 * ACCESS TOKEN FACTORY
 * ====================================================================
 * Propósito: Autorizar peticiones a la API
 * Duración: Corta (15m recomendado)
 * Almacenamiento: Memoria del cliente (nunca localStorage)
 * Payload: { id, rol, dispositivoId }
 */
export class AccessTokenFactory extends BaseTokenFactory {
  constructor(config) {
    super(config); // La validación la hace la clase padre
  }

  /**
   * Genera un Access Token con validación estricta del payload
   * @param {Object} payload - DEBE contener { id, rol, dispositivoId }
   * @returns {string} Token JWT firmado
   */
  generateToken(payload) {
    // VALIDACIÓN #1: El payload debe existir y ser objeto
    if (!payload || typeof payload !== "object") {
      throw new Error("AccessTokenFactory: payload debe ser un objeto");
    }

    // VALIDACIÓN #2: Campos obligatorios según reglas de negocio
    if (!payload.id) {
      throw new Error(
        "AccessTokenFactory: payload debe contener id del usuario",
      );
    }
    if (!payload.rol) {
      throw new Error(
        "AccessTokenFactory: payload debe contener rol del usuario",
      );
    }
    if (!payload.dispositivoId) {
      throw new Error(
        "AccessTokenFactory: payload debe contener dispositivoId",
      );
    }

    // SEGURIDAD: Creamos un payload limpio (evita inyección de datos extra)
    // NUNCA incluir información sensible como password_hash
    const cleanPayload = {
      id: payload.id,
      rol: payload.rol,
      dispositivoId: payload.dispositivoId,
      // Tipo explícito para debugging (no usado en lógica)
      tipo: "access",
    };

    // Firmar con todas las opciones de seguridad
    return jwt.sign(cleanPayload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });
  }

  /**
   * Verifica un Access Token y retorna el payload
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado y validado
   * @throws {Error} Con tipo específico para manejo diferenciado
   */
  verifyToken(token) {
    // Validación básica de entrada
    if (!token || typeof token !== "string") {
      throw new Error("ACCESS_TOKEN_INVALID: No se proporcionó token");
    }

    try {
      // Verificar con TODAS las validaciones posibles
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [this.algorithm],
      });

      // VALIDACIÓN POST-VERIFICACIÓN
      // Aunque JWT verificó la firma, validamos estructura
      if (!decoded.id || !decoded.rol || !decoded.dispositivoId) {
        throw new Error("ACCESS_TOKEN_MALFORMED: Payload incompleto");
      }

      return decoded;
    } catch (error) {
      // MANEJO DIFERENCIADO DE ERRORES
      // Esto permite al middleware responder adecuadamente

      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("ACCESS_TOKEN_EXPIRED");
      }

      if (error instanceof jwt.JsonWebTokenError) {
        // Errores específicos de JWT
        if (error.message.includes("invalid signature")) {
          throw new Error("ACCESS_TOKEN_INVALID_SIGNATURE");
        }
        if (error.message.includes("invalid algorithm")) {
          throw new Error("ACCESS_TOKEN_INVALID_ALGORITHM");
        }
        if (error.message.includes("jwt audience")) {
          throw new Error("ACCESS_TOKEN_INVALID_AUDIENCE");
        }
        if (error.message.includes("jwt issuer")) {
          throw new Error("ACCESS_TOKEN_INVALID_ISSUER");
        }
        throw new Error("ACCESS_TOKEN_INVALID");
      }

      if (error instanceof jwt.NotBeforeError) {
        throw new Error("ACCESS_TOKEN_NOT_ACTIVE");
      }

      // Si ya es un error nuestro, lo relanzamos
      if (error.message.startsWith("ACCESS_TOKEN_")) {
        throw error;
      }

      // Error desconocido (no debería ocurrir)
      console.error("Error inesperado en AccessTokenFactory:", error);
      throw new Error("ACCESS_TOKEN_VERIFICATION_FAILED");
    }
  }
}

/**
 * ====================================================================
 * REFRESH TOKEN FACTORY
 * ====================================================================
 * Propósito: Obtener nuevos Access Tokens sin re-autenticar
 * Duración: Larga (7d recomendado)
 * Almacenamiento: HttpOnly Cookie (seguro contra XSS)
 * Payload: { id, version? } - Mínimo privilegio
 */
export class RefreshTokenFactory extends BaseTokenFactory {
  constructor(config) {
    super(config);
  }

  /**
   * Genera un Refresh Token (payload mínimo por seguridad)
   * @param {Object} payload - DEBE contener { id } (opcional version)
   * @returns {string} Token JWT firmado
   */
  generateToken(payload) {
    // Validación mínima (solo necesitamos ID)
    if (!payload || !payload.id) {
      throw new Error(
        "RefreshTokenFactory: payload debe contener id del usuario",
      );
    }

    // MÍNIMO PRIVILEGIO: Solo incluimos lo necesario
    // La "version" permite invalidar lotes completos de tokens
    const cleanPayload = {
      id: payload.id,
      version: payload.version || 1, // Para rotación/invalidación
      tipo: "refresh",
    };

    return jwt.sign(cleanPayload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });
  }

  /**
   * Verifica un Refresh Token
   * @param {string} token - Token a verificar
   * @returns {Object} Payload decodificado
   */
  verifyToken(token) {
    if (!token || typeof token !== "string") {
      throw new Error("REFRESH_TOKEN_INVALID: No se proporcionó token");
    }

    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: [this.algorithm],
      });

      // Validación básica del payload
      if (!decoded.id) {
        throw new Error("REFRESH_TOKEN_MALFORMED");
      }

      return decoded;
    } catch (error) {
      // Manejo específico para refresh tokens
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error("REFRESH_TOKEN_EXPIRED");
      }

      if (error instanceof jwt.JsonWebTokenError) {
        if (error.message.includes("invalid signature")) {
          throw new Error("REFRESH_TOKEN_INVALID_SIGNATURE");
        }
        if (error.message.includes("invalid algorithm")) {
          throw new Error("REFRESH_TOKEN_INVALID_ALGORITHM");
        }
        if (error.message.includes("jwt audience")) {
          throw new Error("REFRESH_TOKEN_INVALID_AUDIENCE");
        }
        if (error.message.includes("jwt issuer")) {
          throw new Error("REFRESH_TOKEN_INVALID_ISSUER");
        }
        throw new Error("REFRESH_TOKEN_INVALID");
      }

      if (error.message.startsWith("REFRESH_TOKEN_")) {
        throw error;
      }

      console.error("Error inesperado en RefreshTokenFactory:", error);
      throw new Error("REFRESH_TOKEN_VERIFICATION_FAILED");
    }
  }
}

/**
 * ====================================================================
 * TOKEN FACTORY PRINCIPAL (PUNTO DE ENTRADA)
 * ====================================================================
 * Implementa el patrón Factory para crear las fábricas específicas
 * Uso: TokenFactory.create('ACCESS', env.jwt)
 */
export class TokenFactory {
  static TYPES = {
    ACCESS: "ACCESS",
    REFRESH: "REFRESH",
  };

  /**
   * Crea una fábrica de tokens del tipo solicitado
   * @param {string} type - Tipo: 'ACCESS' | 'REFRESH'
   * @param {Object} jwtConfig - Configuración JWT del environment
   * @returns {BaseTokenFactory} Instancia de la fábrica correspondiente
   */
  static create(type, jwtConfig) {
    // Validar tipo
    const tokenType = type.toUpperCase();
    if (!Object.values(this.TYPES).includes(tokenType)) {
      throw new Error(
        `Tipo de token no soportado: ${type}. Use: ${Object.values(this.TYPES).join(" | ")}`,
      );
    }

    // Validar que jwtConfig existe
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
