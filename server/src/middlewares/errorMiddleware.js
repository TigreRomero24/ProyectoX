import { env } from "../config/environment.js";

const HTTP_STATUS = {
  VALIDACION: 400,
  PAYLOAD_INVALIDO: 400,
  ESTADO_INVALIDO: 400,
  DUPLICADO: 409,
  NO_ENCONTRADO: 404,
  ACCESO_DENEGADO: 403,
  TOKEN_INVALIDO: 401,
  SESION_NO_ENCONTRADA: 401,
  USUARIO_INACTIVO: 401,
  USUARIO_NO_REGISTRADO: 401,
};

function resolverStatus(message) {
  if (!message) return 500;
  for (const [prefijo, status] of Object.entries(HTTP_STATUS)) {
    if (message.startsWith(prefijo)) return status;
  }
  return 500;
}

export class ErrorMiddleware {
  static handle(err, req, res, next) {
    const status = err.statusCode || resolverStatus(err.message);
    const esError = status >= 500;

    if (esError) {
      console.error(`[ErrorMiddleware] ${err.name}: ${err.message}`);
      if (env.isDevelopment) console.error(err.stack);
    }

    return res.status(status).json({
      ok: false,
      codigo: esError ? "ERROR_INTERNO" : "ERROR_SOLICITUD",

      mensaje: esError
        ? "Ocurrió un error inesperado en el servidor."
        : err.message,
      ...(env.isDevelopment && esError && { stack: err.stack }),
    });
  }

  static manejar(res, error, mensajeFallback = "Error interno del servidor.") {
    console.error(`[Controller Error]:`, error.message);

    const status = resolverStatus(error.message);

    if (status === 500) {
      return res.status(500).json({
        ok: false,
        codigo: "ERROR_INTERNO",
        mensaje: mensajeFallback,
      });
    }

    return res.status(status).json({
      ok: false,
      codigo: "ERROR_SOLICITUD",
      mensaje: error.message,
    });
  }
}
