import { Router } from "express";
import { AcademicoController } from "../controllers/academico.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";
import { RoleMiddleware } from "../middlewares/roleMiddleware.js";
import { uploadPreguntaImagen } from "../utils/mediaUpload.js";

const router = Router();

const soloAuth = [AuthMiddleware.handle, SessionMiddleware.handle];

const soloAdmin = [
  AuthMiddleware.handle,
  SessionMiddleware.handle,
  RoleMiddleware.require(["ADMINISTRADOR"]),
];

router.get(
  "/preguntas/materia/:id_materia",
  soloAuth,
  AcademicoController.obtenerPreguntas,
);

router.get(
  "/preguntas/materia/:id_materia/test",
  soloAuth,
  AcademicoController.obtenerPreguntasTest,
);

router.get(
  "/preguntas/:id_pregunta",
  soloAuth,
  AcademicoController.obtenerPregunta,
);

router.post(
  "/preguntas/bulk",
  soloAdmin,
  AcademicoController.crearPreguntasBulk,
);

router.post(
  "/preguntas",
  soloAdmin,
  uploadPreguntaImagen,
  AcademicoController.crearPregunta,
);

router.put(
  "/preguntas/:id_pregunta",
  soloAdmin,
  uploadPreguntaImagen,
  AcademicoController.actualizarPregunta,
);

router.patch(
  "/preguntas/:id_pregunta/reactivar",
  soloAdmin,
  AcademicoController.reactivarPregunta,
);

router.delete(
  "/preguntas/:id_pregunta",
  soloAdmin,
  AcademicoController.eliminarPregunta,
);

export default router;
