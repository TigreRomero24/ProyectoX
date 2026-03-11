import { Router } from "express";
import { EvaluacionController } from "../controllers/evaluacion.controller.js";
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

router.get(
  "/configuraciones/materia/:id_materia",
  soloAuth,
  EvaluacionController.obtenerConfiguracionesPorMateria,
);

router.post(
  "/configuraciones/materia/:id_materia",
  soloAdmin,
  EvaluacionController.upsertConfiguracion,
);

router.delete(
  "/configuraciones/:id_config",
  soloAdmin,
  EvaluacionController.eliminarConfiguracion,
);

router.post("/iniciar", soloAuth, EvaluacionController.iniciarExamen);

router.get("/historial", soloAuth, EvaluacionController.obtenerHistorial);

router.get(
  "/retomar/:id_intento",
  soloAuth,
  EvaluacionController.retomarExamen,
);

router.get(
  "/intentos/:id_intento",
  soloAuth,
  EvaluacionController.obtenerIntento,
);

router.patch(
  "/intentos/:id_intento/enviar",
  soloAuth,
  EvaluacionController.enviarExamen,
);

export default router;
