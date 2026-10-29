import { Router } from "express";
import { MusicaController } from "../controllers/musica.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";

const router = Router();

router.get("/buscar", [AuthMiddleware.handle, SessionMiddleware.handle], MusicaController.buscar);

export default router;
