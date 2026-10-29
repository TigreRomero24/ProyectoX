import { MusicaService } from "../services/musica.service.js";

export class MusicaController {
  static async buscar(req, res) {
    try {
      const resultados = await MusicaService.buscar(req.query.q);
      return res.status(200).json({ ok: true, data: resultados });
    } catch (error) {
      console.error("[MusicaController]:", error.message);
      const msg = error.message;
      if (msg.startsWith("VALIDACION")) {
        return res.status(400).json({ ok: false, error: msg });
      }
      return res.status(500).json({ ok: false, error: "Error al buscar música." });
    }
  }
}
