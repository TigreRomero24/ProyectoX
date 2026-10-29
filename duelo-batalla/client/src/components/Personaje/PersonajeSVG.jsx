/**
 * Personaje vectorial armado 100% con formas SVG (sin imágenes, sin
 * librerías), estilo chibi/anime: cabeza grande, ojos grandes con brillo,
 * cuerpo pequeño con brazos, manos, piernas y pies simples.
 *
 * Cada accesorio es una capa adicional que se pinta encima si se le pasa
 * su color; si no, simplemente no se dibuja esa capa.
 *
 * Props (todas opcionales salvo genero/tonoPiel/colorCabello/colorOutfit):
 *  - genero: "MASCULINO" | "FEMENINO"
 *  - tonoPiel, colorCabello, colorOutfit: colores hex
 *  - gafasColor, sombreroColor, capaColor, mochilaColor, marcoColor: hex o null
 *  - size: tamaño en px del lado del SVG (por defecto 200)
 */
export default function PersonajeSVG({
  genero = "MASCULINO",
  tonoPiel = "#f2c9a1",
  colorCabello = "#3b2314",
  colorOutfit = "#2563eb",
  gafasColor = null,
  sombreroColor = null,
  capaColor = null,
  mochilaColor = null,
  marcoColor = null,
  size = 200,
}) {
  const esFemenino = genero === "FEMENINO";
  const colorZapato = "#2b2320";

  return (
    <svg viewBox="0 0 200 240" width={size} height={(size / 200) * 240}>
      {marcoColor && (
        <circle cx="100" cy="128" r="118" fill="none" stroke={marcoColor} strokeWidth="8" />
      )}

      {capaColor && (
        <path
          d="M 62 138 L 26 228 L 100 212 L 174 228 L 138 138 Z"
          fill={capaColor}
          opacity="0.95"
        />
      )}

      {/* piernas + pies */}
      <rect x="72" y="176" width="22" height="44" rx="10" fill={colorOutfit} />
      <rect x="106" y="176" width="22" height="44" rx="10" fill={colorOutfit} />
      <ellipse cx="83" cy="222" rx="15" ry="9" fill={colorZapato} />
      <ellipse cx="117" cy="222" rx="15" ry="9" fill={colorZapato} />

      {mochilaColor && (
        <rect x="146" y="146" width="24" height="54" rx="8" fill={mochilaColor} />
      )}

      {/* brazos + manos */}
      <rect x="42" y="128" width="20" height="48" rx="10" fill={colorOutfit} />
      <rect x="138" y="128" width="20" height="48" rx="10" fill={colorOutfit} />
      <circle cx="52" cy="180" r="11" fill={tonoPiel} />
      <circle cx="148" cy="180" r="11" fill={tonoPiel} />

      {/* torso */}
      <rect x="66" y="124" width="68" height="56" rx="24" fill={colorOutfit} />

      {/* cabello — capa trasera (solo estilo femenino, cae detrás de los hombros) */}
      {esFemenino && (
        <path
          d="M 50 60 Q 44 140 62 168 L 76 156 Q 64 100 68 60 Z
             M 150 60 Q 156 140 138 168 L 124 156 Q 136 100 132 60 Z"
          fill={colorCabello}
        />
      )}

      {/* cuello + cabeza (grande, proporción chibi) */}
      <rect x="90" y="116" width="20" height="14" fill={tonoPiel} />
      <circle cx="100" cy="74" r="52" fill={tonoPiel} />

      {/* mejillas sonrojadas */}
      <ellipse cx="68" cy="88" rx="8" ry="5" fill="#f4a3a3" opacity="0.6" />
      <ellipse cx="132" cy="88" rx="8" ry="5" fill="#f4a3a3" opacity="0.6" />

      {/* ojos anime grandes, con brillo */}
      <circle cx="80" cy="76" r="9" fill="#1f2937" />
      <circle cx="120" cy="76" r="9" fill="#1f2937" />
      <circle cx="77" cy="72" r="3" fill="#ffffff" />
      <circle cx="117" cy="72" r="3" fill="#ffffff" />

      <path
        d="M 90 96 Q 100 103 110 96"
        stroke="#7a4a2b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* cabello — capa frontal */}
      <path
        d={
          esFemenino
            ? "M 46 68 Q 40 18 100 14 Q 160 18 154 68 Q 146 42 100 40 Q 54 42 46 68 Z"
            : "M 50 65 Q 45 20 100 16 Q 155 20 150 65 Q 143 40 100 38 Q 57 40 50 65 Z"
        }
        fill={colorCabello}
      />

      {gafasColor && (
        <g stroke={gafasColor} strokeWidth="4" fill="none">
          <circle cx="80" cy="76" r="15" />
          <circle cx="120" cy="76" r="15" />
          <line x1="95" y1="76" x2="105" y2="76" />
        </g>
      )}

      {sombreroColor && (
        <g>
          <path d="M 46 40 Q 100 -6 154 40 Q 100 26 46 40 Z" fill={sombreroColor} />
          <rect x="90" y="14" width="20" height="8" rx="2" fill={sombreroColor} />
        </g>
      )}
    </svg>
  );
}
