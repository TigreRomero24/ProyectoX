import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { env } from "./src/config/environment.js";
import passport from "./src/config/passport.js";
import { dbConnect } from "./src/config/database.js";

import "./src/models/index.js";
import "./src/models/relacionesModel.js";

import apiRoutes from "./src/routes/api.routes.js";
import { ErrorMiddleware } from "./src/middlewares/errorMiddleware.js";

const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Fingerprint"],
  }),
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

app.use(cookieParser());

app.use(passport.initialize());

// ═══════════════════════════════════════════════════════════════════════════════
// RUTAS
// ═══════════════════════════════════════════════════════════════════════════════

app.get("/", (_req, res) => {
  res.status(200).json({
    proyecto: "EduQuery API",
    version: "1.0.0",
    estado: "Online",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/v1", apiRoutes);

app.use(ErrorMiddleware.handle);

const startServer = async () => {
  try {
    console.info("⏳ Conectando con la base de datos...");
    await dbConnect();

    app.listen(env.port, () => {
      console.info("-------------------------------------------------------");
      console.info(`✅ SERVIDOR ACTIVO: http://localhost:${env.port}`);
      console.info(
        `🌍 ENTORNO: ${env.isProduction ? "PRODUCCIÓN 🚀" : "DESARROLLO 🧪"}`,
      );
      console.info(`🔗 FRONTEND: ${env.frontendUrl}`);
      console.info("-------------------------------------------------------");
    });
  } catch (error) {
    console.error("❌ ERROR CRÍTICO: No se pudo levantar el servicio.");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
