import { Router } from "express";
import { AcademicoController } from "../controllers/academico.controller.js";
import { AuthMiddleware } from "../middlewares/authMiddleware.js";
import { SessionMiddleware } from "../middlewares/sessionMiddleware.js";
import { RoleMiddleware } from "../middlewares/roleMiddleware.js";
import { uploadPreguntaImagen } from "../utils/mediaUpload.js";
import multer from "multer";

// PDF en memoria: solo se reenvía a la IA, no se guarda en disco.
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    file.mimetype === "application/pdf"
      ? cb(null, true)
      : cb(new Error("VALIDACION: Solo se aceptan archivos PDF.")),
}).single("pdf");

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
  "/preguntas/pdf",
  soloAdmin,
  (req, res, next) =>
    uploadPdf(req, res, (err) => {
      if (!err) return next();
      const error =
        err.code === "LIMIT_FILE_SIZE" ? "VALIDACION: El PDF supera los 15 MB." : err.message;
      return res.status(400).json({ ok: false, error });
    }),
  AcademicoController.extraerPreguntasPdf,
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
