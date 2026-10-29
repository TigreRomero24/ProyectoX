import { env } from "../config/environment.js";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";

export class MusicaService {
  static async buscar(query) {
    if (!env.youtube.apiKey) {
      throw new Error(
        "VALIDACION: La búsqueda de música no está configurada (falta YOUTUBE_API_KEY en el .env).",
      );
    }

    const texto = query?.trim();
    if (!texto || texto.length < 2) {
      throw new Error("VALIDACION: Escribe al menos 2 caracteres para buscar.");
    }

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      maxResults: "8",
      q: texto,
      key: env.youtube.apiKey,
    });

    let respuesta;
    try {
      respuesta = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`);
    } catch {
      throw new Error("VALIDACION: No se pudo conectar con YouTube. Intenta de nuevo.");
    }

    if (!respuesta.ok) {
      // 403 típicamente = cuota diaria agotada o key mal restringida
      const detalle = respuesta.status === 403 ? " (revisa la cuota o restricciones de la API key)" : "";
      throw new Error(`VALIDACION: YouTube respondió con error ${respuesta.status}${detalle}.`);
    }

    const data = await respuesta.json();

    return (data.items || [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: item.id.videoId,
        titulo: item.snippet.title,
        canal: item.snippet.channelTitle,
        miniatura: item.snippet.thumbnails?.default?.url || null,
      }));
  }
}
