import { Router } from "express";
import { UsuarioController } from "../controllers/usuario.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";

const router = Router();

router.use(AuthMiddleware.handle);
router.use(SessionMiddleware.handle);
router.use(AuthMiddleware.authorize(["ADMINISTRADOR"]));

router.post("/", UsuarioController.crear);
router.get("/", UsuarioController.listar);
router.put("/:id", UsuarioController.actualizar);
router.patch("/:id/estado", UsuarioController.cambiarEstado);
router.delete("/:id", UsuarioController.eliminar);

export default router;
