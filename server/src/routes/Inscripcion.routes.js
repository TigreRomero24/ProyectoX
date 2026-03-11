import { Router } from "express";
import { InscripcionController } from "../controllers/materia.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";
import { RoleMiddleware } from "../middlewares/roleMiddleware.js";

const router = Router();

const soloAuth = [AuthMiddleware.handle, SessionMiddleware.handle];

const soloAdmin = [
  AuthMiddleware.handle,
  SessionMiddleware.handle,
  RoleMiddleware.require(["ADMINISTRADOR"]),
];

router.get("/", soloAuth, InscripcionController.listar);
router.get("/resumen", soloAuth, InscripcionController.resumen);

router.get("/estudiantes", soloAdmin, InscripcionController.listarEstudiantes);
router.get("/materias", soloAdmin, InscripcionController.listarMaterias);

router.post("/", soloAdmin, InscripcionController.crear);
router.patch("/estado", soloAdmin, InscripcionController.cambiarEstado);
router.delete("/", soloAdmin, InscripcionController.eliminar);

export default router;
