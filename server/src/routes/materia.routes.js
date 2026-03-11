import { Router } from "express";
import { MateriaController } from "../controllers/materia.controller.js";
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

router.get("/mis-materias", soloAuth, MateriaController.obtenerMisMaterias);
router.get("/", soloAuth, MateriaController.obtenerMaterias);
router.get("/:id_materia", soloAuth, MateriaController.obtenerMateriaPorId);

router.post("/", soloAdmin, MateriaController.crearMateria);
router.put("/:id_materia", soloAdmin, MateriaController.actualizarMateria);
router.delete("/:id_materia", soloAdmin, MateriaController.eliminarMateria);

export default router;
