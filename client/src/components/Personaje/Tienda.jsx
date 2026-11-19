import { useMemo, useState } from "react";
import { Coins, Check, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { rutaItem } from "./personajeConfig";

// Secciones de la tienda, en orden.
const SECCIONES = [
  { tipo: "SKIN", titulo: "Skins", etiqueta: "Skin" },
  { tipo: "AVATAR", titulo: "Fotos de perfil", etiqueta: "Foto de perfil" },
];

const RAREZA_LABEL = {
  COMUN: "Común",
  RARO: "Raro",
  EPICO: "Épico",
};

export default function Tienda({ personaje, tienda, onCompra, onError }) {
  const [comprando, setComprando] = useState(null);

  const idsPoseidos = useMemo(
    () => new Set(personaje.inventario.map((it) => it.id_item)),
    [personaje.inventario],
  );

  const comprar = async (item) => {
    setComprando(item.id_item);
    try {
      await api.comprarItem(item.id_item);
      await onCompra();
    } catch (e) {
      onError(e.message || "No se pudo completar la compra.");
    } finally {
      setComprando(null);
    }
  };

  return (
    <div>
      <div className="per-tienda-saldo">
        <Coins size={16} /> Tienes <strong>{personaje.monedas}</strong> monedas
      </div>

      {SECCIONES.map(({ tipo, titulo, etiqueta }) => (
      <section key={tipo}>
      <h3 className="per-subtitulo per-subtitulo--mt">{titulo}</h3>
      <div className="per-tienda-grid">
        {tienda.filter((item) => item.tipo === tipo).map((item) => {
          const poseido = idsPoseidos.has(item.id_item);
          const alcanza = personaje.monedas >= item.costo;
          return (
            <div key={item.id_item} className={`per-item-card per-rareza--${item.rareza.toLowerCase()}`}>
              <img className={`per-item-img per-item-img--${tipo.toLowerCase()}`} src={rutaItem(item.imagen)} alt="" />
              <h4 className="per-item-nombre">{item.nombre}</h4>
              <div className="per-item-meta">
                <span>{etiqueta}</span>
                <span className={`per-item-rareza per-item-rareza--${item.rareza.toLowerCase()}`}>
                  {RAREZA_LABEL[item.rareza]}
                </span>
              </div>
              <div className="per-item-costo">
                {item.costo === 0 ? "Gratis" : <><Coins size={14} /> {item.costo}</>}
              </div>
              <button
                className="per-btn per-btn--primary"
                onClick={() => comprar(item)}
                disabled={poseido || !alcanza || comprando === item.id_item}
              >
                {comprando === item.id_item ? (
                  <Loader2 size={14} className="per-spin" />
                ) : poseido ? (
                  <Check size={14} />
                ) : null}
                {poseido ? "Ya lo tienes" : alcanza ? "Comprar" : "Monedas insuficientes"}
              </button>
            </div>
          );
        })}
      </div>
      </section>
      ))}
    </div>
  );
}
