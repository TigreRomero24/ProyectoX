export const ANIMALES = [
  { id: "owl", nombre: "Búho" },
  { id: "fox", nombre: "Zorro" },
  { id: "cat", nombre: "Gato" },
  { id: "panda", nombre: "Panda" },
  { id: "penguin", nombre: "Pingüino" },
];

// true: cada objeto es un PNG 1024x1024 ya alineado sobre el personaje (se apila a lienzo completo).
// false: cada objeto es un sprite suelto y se coloca con SLOT_GEOMETRIA.
export const CAPAS_ALINEADAS = false;

// De atrás hacia adelante.
export const ORDEN_CAPAS = ["espalda", "base", "cuerpo", "ojos", "cabeza", "mano"];

export const SLOT_POR_TIPO = {
  ESPALDA: "espalda",
  CAPA: "espalda",
  CUERPO: "cuerpo",
  OJOS: "ojos",
  GAFAS: "ojos",
  CABEZA: "cabeza",
  SOMBRERO: "cabeza",
  MANO: "mano",
};

// Posición y ancho base de cada ranura, en porcentaje del lienzo.
export const SLOT_GEOMETRIA = {
  espalda: { left: 5, top: 22, width: 90 },
  cuerpo: { left: 29, top: 46, width: 42 },
  ojos: { left: 33, top: 22, width: 34 },
  cabeza: { left: 28, top: 3, width: 44 },
  mano: { left: 64, top: 52, width: 26 },
};

// Ajuste fino por animal cuando su cabeza difiere (dx/dy en puntos porcentuales, scale multiplica el ancho).
export const AJUSTE_ANIMAL = {
  owl: { dx: 0, dy: 0, scale: 1 },
  fox: { dx: 0, dy: 0, scale: 1 },
  cat: { dx: 0, dy: 0, scale: 1 },
  panda: { dx: 0, dy: 0, scale: 1 },
  penguin: { dx: 0, dy: 0, scale: 1 },
};

export const rutaBase = (animal) => `/personajes/${animal}.png`;
export const rutaItem = (imagen) => `/personajes/${imagen}`;
