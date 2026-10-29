import { env } from "../config/environment.js";

const MAX_PREGUNTAS = 200; // mismo tope que la carga masiva

// Cada pregunta sale con las mismas columnas que la plantilla Excel, así el
// frontend reutiliza su parser, la vista previa y el guardado masivo.
const ESQUEMA = {
  type: "object",
  properties: {
    preguntas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          enunciado: { type: "string" },
          tipo: { type: "string", enum: ["MULTIPLE", "SM", "VF"] },
          opcion_a: { type: "string" },
          opcion_b: { type: "string" },
          opcion_c: { type: "string" },
          opcion_d: { type: "string" },
          correcta: { type: "string" },
          sin_clave: { type: "boolean" },
          tiene_imagen: { type: "boolean" },
        },
        required: ["enunciado", "tipo", "opcion_a", "opcion_b", "correcta", "sin_clave", "tiene_imagen"],
      },
    },
  },
  required: ["preguntas"],
};

const INSTRUCCIONES = `Extrae del PDF adjunto todas las preguntas de evaluación de opción múltiple, selección múltiple y verdadero/falso.

Reglas:
- Recorre el documento completo e incluye todas las preguntas, sin saltarte ninguna.
- Copia el enunciado y las opciones tal como aparecen, sin la letra o número de la opción ("a)", "1."). Las opciones pueden venir cada una en su línea o varias en la misma línea ("a) X  b) Y  c) Z"): sepáralas igual.
- Máximo 4 opciones (opcion_a a opcion_d); deja vacías las que no existan.
- tipo: "MULTIPLE" si hay una sola respuesta correcta, "SM" si hay varias correctas (o el enunciado pide elegir varias), "VF" para verdadero/falso.
- Verdadero/falso: opcion_a "Verdadero", opcion_b "Falso".
- correcta: letra(s) de la(s) opción(es) correcta(s), separadas por coma en SM (ej. "A,C"), solo si el PDF las indica (clave, solucionario, marca, negrita o asterisco). En V/F, "A" = Verdadero y "B" = Falso.
- Si el PDF no indica la respuesta, NO la adivines: correcta "" y sin_clave true. En otro caso, sin_clave false.
- tiene_imagen: true si la pregunta depende de una figura, gráfico, tabla o imagen (ej. "observa la figura"); si no, false.
- No inventes preguntas ni incluyas texto que no sea una pregunta (títulos, instrucciones, etc.).
- Ignora preguntas abiertas, de desarrollo o de otros tipos.`;

export class PdfPreguntasService {
  /** Devuelve filas con formato de la plantilla Excel. No guarda nada. */
  static async extraer(bufferPdf) {
    const crudo = await PdfPreguntasService.#llamarGemini(bufferPdf.toString("base64"));

    let datos;
    try {
      datos = JSON.parse(crudo);
    } catch {
      throw new Error("VALIDACION: La IA devolvió una respuesta ilegible. Intenta de nuevo.");
    }

    // La salida de la IA es entrada no confiable: se normaliza campo por campo.
    const texto = (v) => (typeof v === "string" ? v.trim() : "");
    const filas = (Array.isArray(datos?.preguntas) ? datos.preguntas : [])
      .map((p) => {
        const tipo = ["MULTIPLE", "SM", "VF"].includes(p?.tipo) ? p.tipo : "MULTIPLE";
        const letras = [...new Set(texto(p?.correcta).toUpperCase().match(/[A-D]/g) || [])]
          .filter((l) => tipo !== "VF" || l <= "B")
          .sort();
        return {
          enunciado: texto(p?.enunciado),
          tipo,
          opcion_a: texto(p?.opcion_a),
          opcion_b: texto(p?.opcion_b),
          opcion_c: texto(p?.opcion_c),
          opcion_d: texto(p?.opcion_d),
          correcta: letras.join(","),
          sin_clave: p?.sin_clave === true || letras.length === 0,
          // misma columna que el Excel: no vacía = la fila exige adjuntar imagen
          imagen: p?.tiene_imagen === true ? "si" : "",
        };
      })
      .filter((f) => f.enunciado);

    if (!filas.length) {
      throw new Error("VALIDACION: No se encontraron preguntas de opción múltiple, selección múltiple o V/F en el PDF.");
    }
    return filas.slice(0, MAX_PREGUNTAS);
  }

  // ponytail: proveedor de prueba (capa gratuita de Gemini). Para pasar a
  // Claude Haiku 5.5 se reemplaza solo esta función; extraer() no cambia.
  static async #llamarGemini(pdfBase64) {
    if (!env.gemini.apiKey) {
      throw new Error("VALIDACION: Falta GEMINI_API_KEY en el .env para leer PDFs.");
    }

    // Capa gratuita: los modelos se saturan (503) o agotan cuota (429) a
    // menudo; se prueba el siguiente de la lista antes de rendirse.
    let cuerpo = null;
    let ultimoError = "";
    // Límite total por debajo de los 300 s que Node mantiene abierta la petición.
    const limite = Date.now() + 240_000;
    for (const modelo of env.gemini.models) {
      const restante = Math.min(120_000, limite - Date.now());
      if (restante < 10_000) break;
      let respuesta;
      try {
        respuesta = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": env.gemini.apiKey },
          body: JSON.stringify({
            model: modelo,
            input: [
              { type: "document", data: pdfBase64, mime_type: "application/pdf" },
              { type: "text", text: INSTRUCCIONES },
            ],
            response_format: { type: "text", mime_type: "application/json", schema: ESQUEMA },
          }),
          signal: AbortSignal.timeout(restante),
        });
      } catch (error) {
        const causa = error.name === "TimeoutError" ? `sin respuesta en ${Math.round(restante / 1000)} s` : error.cause?.code || error.message;
        console.error(`[PdfPreguntas] ${modelo}: ${causa}`);
        ultimoError = error.name === "TimeoutError" ? "tardó demasiado" : "no se pudo conectar";
        continue;
      }

      const json = await respuesta.json().catch(() => null);
      if (respuesta.ok && json?.status !== "failed") {
        cuerpo = json;
        break;
      }

      console.error(`[PdfPreguntas] ${modelo}: ${respuesta.status}`, JSON.stringify(json)?.slice(0, 300));
      if (![429, 500, 503].includes(respuesta.status) && json?.status !== "failed") {
        // 400/401/403: problema de la petición o de la clave, otro modelo no lo arregla.
        throw new Error(`VALIDACION: El servicio de IA rechazó la petición (error ${respuesta.status}).`);
      }
      ultimoError =
        respuesta.status === 429 ? "se agotó la cuota gratuita" : "está saturado en este momento";
    }

    if (!cuerpo) {
      throw new Error(`VALIDACION: El servicio de IA ${ultimoError}. Intenta de nuevo en unos minutos.`);
    }

    // El texto viene en steps[].content[] (type "text") de los pasos model_output.
    const texto = (cuerpo?.steps || [])
      .filter((s) => s?.type === "model_output")
      .flatMap((s) => s.content || [])
      .filter((c) => c?.type === "text")
      .map((c) => c.text)
      .join("");
    return texto || cuerpo?.output_text || "";
  }
}
