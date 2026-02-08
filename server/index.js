import express from 'express';
import dotenv from "dotenv";
import LoginRoutes from "./src/routes/auth.routes.js";
import { dbConnect } from "./src/config/database.js"; 

import "./src/models/relacionesModel.js"; 
// Carga de variables de entorno.
dotenv.config();
const app = express();
// OJO: Si en tu .http usas 3000, asegúrate que aquí sea 3000 o que tu .env diga PORT=3000
const PORT = process.env.PORT; 

app.use(express.json());

// RUTA DE PRUEBA
app.get("/", (req, res) => res.send("API v1.0 - Estado: OK 🚀"));

// Rutas de Autenticación y Usuarios
app.use("/api", LoginRoutes);

// --- Inicialización del Servidor ---
const startServer = async () => {
    try {
        // Patrón "Database First": Asegurar conexión a datos antes de aceptar tráfico HTTP.
        await dbConnect();
        
        app.listen(PORT, () => {
            console.info(`✅ Servidor activo en http://localhost:${PORT}`);
            console.info(`📅 Entorno: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error("❌ Error crítico al iniciar el servidor:", error);
        process.exit(1); // Finalizar proceso si la BD falla (Fail Fast).
    }
};

startServer();