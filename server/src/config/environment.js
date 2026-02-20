import dotenv from "dotenv";
import path from "path";

/**
 * ====================================================================
 * ENVIRONMENT.JS - CONFIGURACIÓN CENTRALIZADA (ACTUALIZADA)
 * ====================================================================
 */

const envPath = path.resolve(process.cwd(), ".env");
const { error } = dotenv.config({ path: envPath });

if (error) {
  console.error("\n🔴 FATAL: No se encontró el archivo .env");
  console.error(`    Buscado en: ${envPath}`);
  process.exit(1);
}

// ====================================================================
// 2. VARIABLES REQUERIDAS (Se incluyen las de Google)
// ====================================================================
const REQUIRED = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "JWT_ISSUER",
  "JWT_ACCESS_AUDIENCE",
  "JWT_REFRESH_AUDIENCE",
  "JWT_ALGORITHM",
  "GOOGLE_CLIENT_ID", // Obligatorio para Passport
  "GOOGLE_CLIENT_SECRET", // Obligatorio para Passport
  "GOOGLE_CALLBACK_URL", // Obligatorio para redirección
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n🔴 FATAL: Faltan variables de entorno requeridas:");
  missing.forEach((key) => console.error(`    - ${key}`));
  console.error(
    "\n⚠️  Asegúrate de agregarlas a tu archivo .env para que la app pueda arrancar.\n",
  );
  process.exit(1);
}

// ====================================================================
// 3. VALIDACIONES DE SEGURIDAD (Se mantienen las existentes)
// ====================================================================

if (
  process.env.JWT_ACCESS_SECRET.length < 32 ||
  process.env.JWT_REFRESH_SECRET.length < 32
) {
  console.error(
    "\n🔴 SEGURIDAD: Los secrets de JWT deben tener al menos 32 caracteres.\n",
  );
  process.exit(1);
}

if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error(
    "\n🔴 SEGURIDAD: Los secrets de access y refresh NO pueden ser iguales.\n",
  );
  process.exit(1);
}

const timeRegex = /^[0-9]+[smhd]$/;
if (
  !timeRegex.test(process.env.JWT_ACCESS_EXPIRES_IN) ||
  !timeRegex.test(process.env.JWT_REFRESH_EXPIRES_IN)
) {
  console.error("\n🔴 ERROR: Formato de tiempo JWT inválido (ej: 15m, 7d).\n");
  process.exit(1);
}

// ====================================================================
// 4. CONFIGURACIÓN DE ENTORNO (NODE_ENV)
// ====================================================================
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// ====================================================================
// 5. EXPORTACIÓN TIPADA E INMUTABLE
// ====================================================================
export const env = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction: IS_PRODUCTION,
  isDevelopment: NODE_ENV === "development",
  port: process.env.PORT || 3000,

  // Configuración JWT
  jwt: Object.freeze({
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    audiences: {
      api: process.env.JWT_ACCESS_AUDIENCE,
      auth: process.env.JWT_REFRESH_AUDIENCE,
    },
    algorithm: process.env.JWT_ALGORITHM,
  }),

  // NUEVA SECCIÓN: Configuración Google (Acoplada al estándar del archivo)
  google: Object.freeze({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  }),

  get sanitized() {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      google: { callbackUrl: this.google.callbackUrl }, // No exponer secretos en logs
      jwt: {
        accessExpiresIn: this.jwt.accessExpiresIn,
        issuer: this.jwt.issuer,
      },
    };
  },
});

// ====================================================================
// 6. MENSAJE DE CONFIRMACIÓN
// ====================================================================
console.log("\n✅ Configuración cargada correctamente");
console.log(
  `    🌍 Entorno: ${IS_PRODUCTION ? "🚀 PRODUCCIÓN" : "🧪 DESARROLLO"}`,
);
console.log(
  `    🔑 Google OAuth: ${env.google.clientId.substring(0, 10)}... (Cargado)`,
);
console.log("");
