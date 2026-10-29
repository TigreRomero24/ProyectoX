import { useState } from "react";
import {
  AJUSTE_ANIMAL,
  CAPAS_ALINEADAS,
  ORDEN_CAPAS,
  SLOT_GEOMETRIA,
  SLOT_POR_TIPO,
  rutaBase,
  rutaItem,
} from "./personajeConfig";

/**
 * Apila PNGs transparentes sobre un lienzo cuadrado: animal base + un objeto por ranura.
 * Si la imagen base no existe, muestra `fallback`. Un objeto sin imagen se omite.
 *
 * Props: animal, items (array de { tipo, imagen }), size (px), fallback (nodo), onBaseError
 */
export default function PersonajeCapas({ animal = "owl", items = [], size = 200, fallback = null, onBaseError }) {
  const [baseFalla, setBaseFalla] = useState(false);
  const [fallidas, setFallidas] = useState({});

  if (baseFalla) return fallback;

  const ajuste = AJUSTE_ANIMAL[animal] || { dx: 0, dy: 0, scale: 1 };

  const estiloCapa = (slot) => {
    if (CAPAS_ALINEADAS) return { position: "absolute", inset: 0, width: "100%", height: "100%" };
    const g = SLOT_GEOMETRIA[slot];
    const ajustable = slot === "cabeza" || slot === "ojos";
    return {
      position: "absolute",
      left: `${g.left + (ajustable ? ajuste.dx : 0)}%`,
      top: `${g.top + (ajustable ? ajuste.dy : 0)}%`,
      width: `${g.width * (ajustable ? ajuste.scale : 1)}%`,
    };
  };

  const itemsPorSlot = (slot) =>
    items.filter((it) => it.imagen && SLOT_POR_TIPO[it.tipo] === slot && !fallidas[it.imagen]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {ORDEN_CAPAS.map((slot, i) =>
        slot === "base" ? (
          <img
            key="base"
            src={rutaBase(animal)}
            alt={animal}
            draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: i }}
            onError={() => {
              setBaseFalla(true);
              onBaseError?.();
            }}
          />
        ) : (
          itemsPorSlot(slot).map((it) => (
            <img
              key={`${slot}-${it.imagen}`}
              src={rutaItem(it.imagen)}
              alt=""
              draggable={false}
              style={{ ...estiloCapa(slot), zIndex: i }}
              onError={() => setFallidas((prev) => ({ ...prev, [it.imagen]: true }))}
            />
          ))
        ),
      )}
    </div>
  );
}
