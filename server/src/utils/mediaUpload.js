import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import multer from "multer";

const MEDIA_ROOT = path.resolve(process.cwd(), "storage");
const MATERIAS_DIR = path.join(MEDIA_ROOT, "materias");
const PREGUNTAS_DIR = path.join(MEDIA_ROOT, "preguntas");

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

const ensureMateriasStorage = async () => {
  await fs.mkdir(MATERIAS_DIR, { recursive: true });
};

const ensurePregunasStorage = async () => {
  await fs.mkdir(PREGUNTAS_DIR, { recursive: true });
};

const buildFilename = (idMateria, extension) => {
  const timestampUnix = Math.floor(Date.now() / 1000);
  const rand8 = crypto.randomBytes(4).toString("hex");
  return `mat_${idMateria}_${timestampUnix}_${rand8}.${extension}`;
};

const buildPreguntaFilename = (idPregunta, extension) => {
  const timestampUnix = Math.floor(Date.now() / 1000);
  const rand8 = crypto.randomBytes(4).toString("hex");
  return `preg_${idPregunta}_${timestampUnix}_${rand8}.${extension}`;
};

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensureMateriasStorage();
      cb(null, MATERIAS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const idMateria = Number.parseInt(req.params.id_materia, 10);
    const idSegment = Number.isInteger(idMateria) && idMateria > 0 ? idMateria : "tmp";
    const rawExt = path.extname(file.originalname || "").replace(".", "").toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt)
      ? rawExt
      : ALLOWED_MIME_TO_EXT[file.mimetype] || "jpg";

    cb(null, buildFilename(idSegment, safeExt));
  },
});

const storagePregunta = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensurePregunasStorage();
      cb(null, PREGUNTAS_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname || "").replace(".", "").toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt)
      ? rawExt
      : ALLOWED_MIME_TO_EXT[file.mimetype] || "jpg";
    const timestamp = Date.now();
    const rand = crypto.randomBytes(2).toString("hex");

    cb(null, `preg_${timestamp}_${rand}.${safeExt}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname || "").replace(".", "").toLowerCase();
  const mimeAllowed = Object.prototype.hasOwnProperty.call(ALLOWED_MIME_TO_EXT, file.mimetype);
  const extensionAllowed = ALLOWED_EXTENSIONS.has(extension);

  if (!mimeAllowed || !extensionAllowed) {
    cb(
      new Error(
        "VALIDACION: Formato de imagen no permitido. Extensiones válidas: jpg, jpeg, png, webp.",
      ),
    );
    return;
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter,
});

const uploadPregunta = multer({
  storage: storagePregunta,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter,
});

export const uploadMateriaImagen = (req, res, next) => {
  upload.single("imagen")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        ok: false,
        error: "VALIDACION: La imagen excede el tamaño máximo permitido de 2MB.",
      });
      return;
    }

    res.status(400).json({
      ok: false,
      error: error.message || "VALIDACION: No se pudo procesar la imagen.",
    });
  });
};

export const buildMateriaPublicUrl = (filename) => `/media/materias/${filename}`;

export const deleteFileIfExists = async (filePath) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

export const deleteMateriaImageByUrl = async (imagenUrl) => {
  if (!imagenUrl) return;
  if (!imagenUrl.startsWith("/media/materias/")) return;

  const filename = path.basename(imagenUrl);
  await deleteFileIfExists(path.join(MATERIAS_DIR, filename));
};

export const uploadPreguntaImagen = (req, res, next) => {
  uploadPregunta.single("imagen")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        ok: false,
        error: "VALIDACION: La imagen excede el tamaño máximo permitido de 2MB.",
      });
      return;
    }

    res.status(400).json({
      ok: false,
      error: error.message || "VALIDACION: No se pudo procesar la imagen.",
    });
  });
};

export const buildPreguntaPublicUrl = (filename) => `/media/preguntas/${filename}`;

export const deletePreguntaImageByUrl = async (imagenUrl) => {
  if (!imagenUrl) return;
  if (!imagenUrl.startsWith("/media/preguntas/")) return;

  const filename = path.basename(imagenUrl);
  await deleteFileIfExists(path.join(PREGUNTAS_DIR, filename));
};

const PERFIL_DIR = path.join(MEDIA_ROOT, "perfil");

const ensurePerfilStorage = async () => {
  await fs.mkdir(PERFIL_DIR, { recursive: true });
};

const storagePerfil = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      await ensurePerfilStorage();
      cb(null, PERFIL_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname || "").replace(".", "").toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(rawExt)
      ? rawExt
      : ALLOWED_MIME_TO_EXT[file.mimetype] || "jpg";
    const timestamp = Date.now();
    const rand = crypto.randomBytes(2).toString("hex");

    cb(null, `perf_${timestamp}_${rand}.${safeExt}`);
  },
});

const uploadPerfil = multer({
  storage: storagePerfil,
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter,
});

export const uploadPerfilImagen = (req, res, next) => {
  uploadPerfil.single("imagen")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        ok: false,
        error: "VALIDACION: La imagen excede el tamaño máximo permitido de 2MB.",
      });
      return;
    }

    res.status(400).json({
      ok: false,
      error: error.message || "VALIDACION: No se pudo procesar la imagen.",
    });
  });
};

export const buildPerfilPublicUrl = (filename) => `/media/perfil/${filename}`;

export const deletePerfilImageByUrl = async (imagenUrl) => {
  if (!imagenUrl) return;
  if (!imagenUrl.startsWith("/media/perfil/")) return;

  const filename = path.basename(imagenUrl);
  await deleteFileIfExists(path.join(PERFIL_DIR, filename));
};
