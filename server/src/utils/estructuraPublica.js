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

  return resto;
}
