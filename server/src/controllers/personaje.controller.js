import { PersonajeService } from "../services/personaje.service.js";

export class PersonajeController {
  static #manejarError(res, error, mensajeServidor) {
    console.error("[PersonajeController]:", error.message);
    const msg = error.message;

    if (msg.startsWith("VALIDACION")) {
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

  static async obtenerPerfil(req, res) {
    try {
      const data = await PersonajeService.obtenerPerfil(req.user.id);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al obtener el personaje.");
    }
  }

  static async actualizarApariencia(req, res) {
    try {
      const personaje = await PersonajeService.actualizarApariencia(req.user.id, req.body);
      return res.status(200).json({
        ok: true,
        mensaje: "Apariencia actualizada.",
        data: personaje,
      });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al actualizar apariencia.");
    }
  }

  static async obtenerTienda(req, res) {
    try {
      const data = await PersonajeService.obtenerTienda();
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al obtener la tienda.");
    }
  }

  static async comprarItem(req, res) {
    try {
      const id_item = parseInt(req.params.id_item, 10);
      const data = await PersonajeService.comprarItem(req.user.id, id_item);
      return res.status(200).json({ ok: true, mensaje: "Compra realizada.", data });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al comprar el item.");
    }
  }

  static async equiparItem(req, res) {
    try {
      const id_item = parseInt(req.params.id_item, 10);
      const data = await PersonajeService.equiparItem(req.user.id, id_item);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al equipar el item.");
    }
  }

  static async desequiparItem(req, res) {
    try {
      const data = await PersonajeService.desequiparItem(req.user.id, req.params.tipo);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return PersonajeController.#manejarError(res, error, "Error al desequipar el item.");
    }
  }
}
