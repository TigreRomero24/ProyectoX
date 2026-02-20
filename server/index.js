import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import LoginRoutes from "./src/routes/auth.routes.js";
import { dbConnect } from "./src/config/database.js";
import "./src/models/relacionesModel.js";

// ====================================================================
// IMPORTACIONES NUEVAS (CONFIGURACIÓN Y SEGURIDAD)
// ====================================================================
import { env } from "./src/config/environment.js"; // Reemplaza a dotenv directo
import passport from "./src/config/passport.js"; // Instancia de Google OAuth

const app = express();
const PORT = env.port; // Usamos el puerto validado de tu environment.js

// ====================================================================
// MIDDLEWARES GLOBALES
// ====================================================================
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, // Permite envío de cookies (Refresh Token)
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Fingerprint"],
  }),
);

app.use(express.json());
app.use(cookieParser()); // Parsear cookies

// NUEVO: Inicializar Passport.
app.use(passport.initialize());
// ====================================================================
// RUTAS
// ====================================================================
// RUTA DE PRUEBA
app.get("/", (req, res) => res.send("API v1.0 - Estado: OK 🚀"));

// Rutas de Autenticación y Usuarios
app.use("/api", LoginRoutes);

// ====================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ====================================================================
const startServer = async () => {
  try {
    await dbConnect(); // Conexión a PostgreSQL (Sequelize)

    app.listen(PORT, () => {
      console.info(`✅ Servidor activo en http://localhost:${PORT}`);
      console.info(`📅 Entorno: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error("❌ Error crítico al iniciar el servidor:", error);
    process.exit(1);
  }
};

startServer();
