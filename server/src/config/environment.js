import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const { error } = dotenv.config({ path: envPath });

if (error) {
  console.error("\n🔴 FATAL: No se encontró el archivo .env o es ilegible.");
  process.exit(1);
}

// ====================================================================
// 1. VARIABLES REQUERIDAS (Contrato de existencia)
// ====================================================================
const REQUIRED = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "JWT_ISSUER",
  "JWT_ALGORITHM",

  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",

  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "DB_HOST",
  "DB_PORT",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n🔴 FATAL: Faltan variables de entorno requeridas:");
  missing.forEach((key) => console.error(`    - ${key}`));
  console.error(
    "\n⚠️  El sistema no puede iniciar sin estas configuraciones.\n",
  );
  process.exit(1);
}

if (
  process.env.JWT_ACCESS_SECRET.length < 32 ||
  process.env.JWT_REFRESH_SECRET.length < 32
) {
  console.error(
    "\n🔴 SEGURIDAD: Los secrets de JWT deben tener al menos 32 caracteres.",
  );
  process.exit(1);
}

if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error(
    "\n🔴 SEGURIDAD: Los secrets de Access y Refresh no pueden ser iguales.",
  );
  process.exit(1);
}

// Formato de Tiempo (ej: 15m, 7d)
const timeRegex = /^[0-9]+[smhd]$/;
if (
  !timeRegex.test(process.env.JWT_ACCESS_EXPIRES_IN) ||
  !timeRegex.test(process.env.JWT_REFRESH_EXPIRES_IN)
) {
  console.error("\n🔴 ERROR: Formato de tiempo JWT inválido (ej: 15m, 7d).");
  process.exit(1);
}

const NODE_ENV = process.env.NODE_ENV || "development";

export const env = Object.freeze({
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === "production",
  isDevelopment: NODE_ENV === "development",
  port: parseInt(process.env.PORT, 10) || 3000,

  db: Object.freeze({
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
  }),

  jwt: Object.freeze({
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    issuer: process.env.JWT_ISSUER,
    algorithm: process.env.JWT_ALGORITHM,
    audiences: {
      api: process.env.JWT_ACCESS_AUDIENCE || "eduquery-api",
      auth: process.env.JWT_REFRESH_AUDIENCE || "eduquery-auth",
    },
  }),

  google: Object.freeze({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  }),

  get sanitized() {
    return {
      nodeEnv: this.nodeEnv,
      port: this.port,
      db: { host: this.db.host, name: this.db.name },
      google: { callbackUrl: this.google.callbackUrl },
    };
  },
});

console.log("\n✅ Configuración del sistema cargada correctamente.");
