import { useState } from "react";
import { SKIN_INICIAL, rutaItem } from "./personajeConfig";

/** Personaje de cuerpo completo. Si la imagen no carga, muestra la skin inicial. */
export default function SkinPersonaje({ imagen, alt = "", className = "" }) {
  const [fallida, setFallida] = useState(null);
  const src = imagen && imagen !== fallida ? imagen : SKIN_INICIAL;
  return (
    <img
      className={className}
      src={rutaItem(src)}
      alt={alt}
      draggable={false}
      onError={() => imagen && setFallida(imagen)}
    />
  );
}
