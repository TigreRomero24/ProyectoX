import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import securityRoutes from "./src/routes/security.routes.js";
import { env } from "./src/config/environment.js";
import passport from "./src/config/passport.js";
import { dbConnect } from "./src/config/database.js";

import "./src/models/index.js";
import "./src/models/relacionesModel.js";

import apiRoutes from "./src/routes/api.routes.js";
import { ErrorMiddleware } from "./src/middlewares/errorMiddleware.js";
import { setupDueloSocket } from "./src/sockets/duelo.socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", 1);

const corsOptions = {
  origin: true,
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-Fingerprint"],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/v1", apiRoutes);
app.use("/api/v1", securityRoutes);

// Servir archivos estáticos de medios
app.use("/media/materias", express.static(path.join(__dirname, "storage", "materias")));
app.use("/media/preguntas", express.static(path.join(__dirname, "storage", "preguntas")));
app.use("/media/perfil", express.static(path.join(__dirname, "storage", "perfil")));

app.use(ErrorMiddleware.handle);

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// El servidor HTTP se crea explícitamente para poder adjuntarle Socket.io
// (app.listen de Express lo hace por debajo de todas formas).
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: corsOptions,
});

setupDueloSocket(io);

const startServer = async () => {
  try {
    console.info("Conectando con la base de datos...");
    await dbConnect();

    httpServer.listen(env.port, () => {
      console.info("-------------------------------------------------------");
      console.info(`SERVIDOR ACTIVO: http://localhost:${env.port}`);
      console.info(
        `ENTORNO: ${env.isProduction ? "PRODUCCIÓN" : "DESARROLLO"}`,
      );
      console.info(`FRONTEND: ${env.frontendUrl}`);
      console.info("SOCKET.IO: namespace /duelo listo");
      console.info("-------------------------------------------------------");
    });
  } catch (error) {
    console.error("ERROR CRÍTICO: No se pudo levantar el servicio.");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
