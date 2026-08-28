import { DueloService } from "../services/duelo.service.js";

export class DueloController {
  static #manejarError(res, error, mensajeServidor) {
    console.error("[DueloController]:", error.message);
    const msg = error.message;

    if (msg.startsWith("VALIDACION") || msg.startsWith("ESTADO_INVALIDO")) {
      return res.status(400).json({ ok: false, error: msg });
    }
    if (msg.startsWith("NO_ENCONTRADO")) {
      return res.status(404).json({ ok: false, error: msg });
    }
    if (msg.startsWith("RESTRICCION")) {
      return res.status(409).json({ ok: false, error: msg });
    }

    return res.status(500).json({ ok: false, error: mensajeServidor });
  }

  /**
   * POST /duelos
   * Crea una sala de duelo (ESPERANDO) para la materia indicada y
   * automáticamente inscribe al creador como primer participante.
   */
  static async crearDuelo(req, res) {
    try {
      const id_usuario = req.user.id;
      const duelo = await DueloService.crearDuelo(id_usuario, req.body);
      return res.status(201).json({
        ok: true,
        mensaje: "Duelo creado correctamente.",
        data: duelo,
      });
    } catch (error) {
      return DueloController.#manejarError(res, error, "Error al crear el duelo.");
    }
  }

  /**
   * GET /duelos/:codigo
   * Consulta el estado de una sala por su código (lobby / reconexión).
   */
  static async obtenerDuelo(req, res) {
    try {
      const duelo = await DueloService.obtenerDueloPorCodigo(req.params.codigo);
      return res.status(200).json({ ok: true, data: duelo });
    } catch (error) {
      return DueloController.#manejarError(res, error, "Error al obtener el duelo.");
    }
  }

  /**
   * POST /duelos/:codigo/unirse
   * Une al usuario autenticado a la sala. La confirmación en tiempo real
   * (lista de participantes actualizada) llega luego vía socket.
   */
  static async unirseDuelo(req, res) {
    try {
      const id_usuario = req.user.id;
      const duelo = await DueloService.unirseDuelo(req.params.codigo, id_usuario);
      return res.status(200).json({ ok: true, data: duelo });
    } catch (error) {
      return DueloController.#manejarError(res, error, "Error al unirse al duelo.");
    }
  }
}
