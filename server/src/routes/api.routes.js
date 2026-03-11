import { Router } from "express";

import authRoutes from "./auth.routes.js";
import materiaRoutes from "./materia.routes.js";
import inscripcionRoutes from "./Inscripcion.routes.js";
import academicoRoutes from "./academico.routes.js";
import evaluacionRoutes from "./evaluacion.routes.js";
import usuarioRoutes from "./usuario.routes.js";

const router = Router();

router.get("/health", (_req, res) =>
  res.json({ ok: true, mensaje: "API funcionando correctamente." }),
);

router.use("/auth", authRoutes);
router.use("/materias", materiaRoutes);
router.use("/inscripciones", inscripcionRoutes);
router.use("/academico", academicoRoutes);
router.use("/evaluaciones", evaluacionRoutes);
router.use("/usuarios", usuarioRoutes);

export default router;
