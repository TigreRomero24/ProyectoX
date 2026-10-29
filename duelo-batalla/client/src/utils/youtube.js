const PATRONES = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

/**
 * Acepta un link de YouTube en cualquiera de sus formatos comunes o
 * directamente un ID de 11 caracteres, y devuelve solo el ID.
 * Si no reconoce nada válido, devuelve null.
 */
export function extraerYoutubeId(entrada) {
  if (!entrada || typeof entrada !== "string") return null;
  const texto = entrada.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(texto)) return texto;

  for (const patron of PATRONES) {
    const match = texto.match(patron);
    if (match) return match[1];
  }
  return null;
}
