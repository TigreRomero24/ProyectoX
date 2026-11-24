// Quita de estructura_json todo lo que revela la respuesta correcta, para
// enviarla a un estudiante durante un examen.
export function estructuraPublica(tipo_pregunta, estructura) {
  if (!estructura || typeof estructura !== "object") return estructura ?? null;

  const { respuesta, ...resto } = estructura;

  if (Array.isArray(resto.espacios)) {
    resto.espacios = resto.espacios.map(({ respuestas, ...espacio }) => espacio);
  }

  // ORDENAR guarda las opciones ya en el orden correcto: se envían
  // mezcladas y con su id, para que el orden no delate la respuesta.
  if (tipo_pregunta === "ORDENAR" && Array.isArray(resto.opciones)) {
    const ids = respuesta?.orden_ids || [];
    const items = resto.opciones.map((texto, i) => ({
      id: ids[i] || String.fromCharCode(65 + i),
      texto,
    }));
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    resto.opciones = items;
  }

  // RELACIONAR: la columna izquierda va con id (A, B, ...) y la derecha
  // mezclada como textos sueltos, para que la posición no delate el par.
  if (tipo_pregunta === "RELACIONAR" && Array.isArray(resto.pares)) {
    resto.izquierda = resto.pares.map((p, i) => ({
      id: String.fromCharCode(65 + i),
      texto: p.izquierda,
    }));
    resto.derecha = mezclar(resto.pares.map((p) => p.derecha));
    delete resto.pares;
  }

  return resto;
}

function mezclar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Puntaje de RELACIONAR: fracción de pares bien relacionados (0..1).
// respuesta_json = { pares: [{ izq_id: "A", derecha: "texto" }] }
export function puntuarRelacionar(estructura, raw) {
  const pares = Array.isArray(estructura?.pares) ? estructura.pares : [];
  const user = new Map(
    (Array.isArray(raw?.pares) ? raw.pares : []).map((p) => [
      String(p?.izq_id),
      String(p?.derecha ?? "").trim().toLowerCase(),
    ]),
  );
  const hits = pares.filter(
    (p, i) =>
      user.get(String.fromCharCode(65 + i)) ===
      String(p.derecha ?? "").trim().toLowerCase(),
  ).length;
  return pares.length ? hits / pares.length : 0;
}
