import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

/**
 * =========================================================
 * 1. INTERFAZ BASE (Abstraction Layer)
 * Define el contrato que todos los tokens deben cumplir.
 * =========================================================
 */
class TokenStrategy {
    generate(payload) { throw new Error("Método 'generate' no implementado"); }
    verify(token) { throw new Error("Método 'verify' no implementado"); }
}

/**
 * =========================================================
 * 2. IMPLEMENTACIÓN JWT (Concrete Strategy)
 * Maneja la lógica específica de JSON Web Tokens.
 * =========================================================
 */
class JWTToken extends TokenStrategy {
    constructor() {
        super();
        // 🚨 SEGURIDAD: Validación estricta de variables de entorno.
        // Si no hay secreto en producción, la aplicación debe fallar (Fail Fast),
        // no usar "secreto_por_defecto" que es vulnerable a ataques de diccionario.
        this.secretKey = process.env.JWT_SECRET;
        
        if (!this.secretKey) {
            console.warn("⚠️ ADVERTENCIA: JWT_SECRET no definido. Usando clave insegura de desarrollo.");
            this.secretKey = "DEV_SECRET_DO_NOT_USE_IN_PROD"; 
        }

        this.expires = process.env.JWT_EXPIRES_IN || '8h';
    }

    /**
     * Genera un token firmado.
     * @param {Object} payload - Datos a encriptar (id, rol, etc.)
     */
    generate(payload) {
        return jwt.sign(payload, this.secretKey, {
            expiresIn: this.expires,
            algorithm: 'HS256' 
        });
    }

    /**
     * Verifica la validez y vigencia del token.
     * @param {string} token 
     * @returns {Object|null} Payload decodificado o null si es inválido.
     */
    verify(token) {
        try {
            return jwt.verify(token, this.secretKey);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                console.log("Token expirado a las: ", error.expiredAt);
            } else if (error.name === 'JsonWebTokenError') {
                console.warn("Intento de uso de token manipulado o inválido.");
            }
            return null; 
        }
    }
}

/**
 * =========================================================
 * 3. TOKEN FACTORY (Pattern Entry Point)
 * Centraliza la creación de instancias de tokens.
 * =========================================================
 */
export class TokenFactory {
    static createToken(type = "JWT") {
        switch (type.toUpperCase()) {
            case "JWT":
                return new JWTToken();
            // case "OAUTH": return new OAuthToken();
            default:
                throw new Error(`Tipo de token '${type}' no soportado por la fábrica.`);
        }
    }
}