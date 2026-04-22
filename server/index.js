import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import securityRoutes from "./src/routes/security.routes.js";
import { env } from "./src/config/environment.js";
import passport from "./src/config/passport.js";
import { dbConnect } from "./src/config/database.js";

import "./src/models/index.js";
import "./src/models/relacionesModel.js";

import apiRoutes from "./src/routes/api.routes.js";
import { ErrorMiddleware } from "./src/middlewares/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Device-Fingerprint"],
  }),
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1", apiRoutes);
app.use("/api/v1", securityRoutes);

// Servir archivos estáticos de medios
app.use("/media/materias", express.static(path.join(__dirname, "storage", "materias")));
app.use("/media/preguntas", express.static(path.join(__dirname, "storage", "preguntas")));

app.use(ErrorMiddleware.handle);

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const startServer = async () => {
  try {
    console.info("Conectando con la base de datos...");
    await dbConnect();

    app.listen(env.port, () => {
      console.info("-------------------------------------------------------");
      console.info(`SERVIDOR ACTIVO: http://localhost:${env.port}`);
      console.info(
        `ENTORNO: ${env.isProduction ? "PRODUCCIÓN" : "DESARROLLO"}`,
      );
      console.info(`FRONTEND: ${env.frontendUrl}`);
      console.info("-------------------------------------------------------");
    });
  } catch (error) {
    console.error("ERROR CRÍTICO: No se pudo levantar el servicio.");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();