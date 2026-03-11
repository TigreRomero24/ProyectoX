import { env } from "../config/environment.js";

export class ErrorMiddleware {
  static handle(err, req, res, next) {
    console.error(`[🔥 Catch Global] ${err.name}: ${err.message}`);

    const statusCode = err.statusCode || 500;

    const message = err.isOperational
      ? err.message
      : "Ocurrió un error inesperado en el servidor.";

    res.status(statusCode).json({
      error: message,
      ...(env.isDevelopment && { stack: err.stack }),
    });
  }
}
