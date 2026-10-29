import { Router } from "express";
import { PersonajeController } from "../controllers/personaje.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";

const router = Router();

const soloAuth = [AuthMiddleware.handle, SessionMiddleware.handle];

router.get("/", soloAuth, PersonajeController.obtenerPerfil);
router.put("/apariencia", soloAuth, PersonajeController.actualizarApariencia);
router.get("/tienda", soloAuth, PersonajeController.obtenerTienda);
router.post("/tienda/:id_item/comprar", soloAuth, PersonajeController.comprarItem);
router.post("/equipar/:id_item", soloAuth, PersonajeController.equiparItem);
router.delete("/equipar/:tipo", soloAuth, PersonajeController.desequiparItem);

export default router;
