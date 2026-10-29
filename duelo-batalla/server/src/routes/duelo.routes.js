import { Router } from "express";
import { DueloController } from "../controllers/duelo.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";

const router = Router();

const soloAuth = [AuthMiddleware.handle, SessionMiddleware.handle];

router.post("/", soloAuth, DueloController.crearDuelo);
router.get("/:codigo", soloAuth, DueloController.obtenerDuelo);
router.post("/:codigo/unirse", soloAuth, DueloController.unirseDuelo);

export default router;
