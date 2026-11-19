import { useMemo, useState } from "react";
import { Coins, Star, Check, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import SkinPersonaje from "./SkinPersonaje";
import { rutaItem } from "./personajeConfig";

export default function MiPersonaje({ personaje, onActualizado, onError }) {
  const [accionando, setAccionando] = useState(null);
  const { actualizarSesion } = useAuth();

  const idEquipado = personaje.accesorios_equipados?.SKIN;
  const skin = useMemo(
    () => personaje.inventario.find((it) => it.id_item === idEquipado),
    [personaje.inventario, idEquipado],
  );

  const equipar = async (item) => {
    setAccionando(item.id_item);
    try {
      const res = await api.equiparItem(item.id_item);
      onActualizado({ ...personaje, accesorios_equipados: res.data.accesorios_equipados });
      // Foto de perfil nueva: el servidor manda un token con la foto actualizada.
      if (res.accessToken) actualizarSesion(res.accessToken);
    } catch (e) {
      onError(e.message || "No se pudo equipar.");
    } finally {
      setAccionando(null);
    }
  };

  const xpEnNivel = personaje.xp - (personaje.nivel - 1) * 100;
  const xpPorcentaje = Math.min(100, xpEnNivel);

  return (
    <div className="per-grid">
      <div className="per-columna per-columna--preview">
        <SkinPersonaje className="per-skin" imagen={skin?.imagen} alt={skin?.nombre || "Personaje"} />
        {skin && <p className="per-skin-nombre">{skin.nombre}</p>}

        <div className="per-stats">
          <div className="per-stat">
            <Coins size={16} />
            <span>{personaje.monedas}</span>
          </div>
          <div className="per-stat">
            <Star size={16} />
            <span>Nivel {personaje.nivel}</span>
          </div>
        </div>

        <div className="per-xp-track">
          <div className="per-xp-fill" style={{ width: `${xpPorcentaje}%` }} />
        </div>
        <p className="per-xp-label">{xpEnNivel} / 100 XP para el siguiente nivel</p>
      </div>

      <div className="per-columna">
        {[
          { tipo: "SKIN", titulo: "Mis skins", etiqueta: "Skin" },
          { tipo: "AVATAR", titulo: "Mis fotos de perfil", etiqueta: "Foto de perfil" },
        ].map(({ tipo, titulo, etiqueta }) => {
          const items = personaje.inventario.filter((it) => it.tipo === tipo);
          if (!items.length) return null;
          return (
            <section key={tipo}>
              <h3 className={`per-subtitulo${tipo === "SKIN" ? "" : " per-subtitulo--mt"}`}>{titulo}</h3>
              <div className="per-inventario">
                {items.map((item) => {
                  const equipado = item.id_item === personaje.accesorios_equipados?.[tipo];
                  return (
                    <div key={item.id_item} className={`per-inv-item${equipado ? " equipado" : ""}`}>
                      <img className={`per-inv-img per-inv-img--${tipo.toLowerCase()}`} src={rutaItem(item.imagen)} alt="" />
                      <div className="per-inv-info">
                        <span className="per-inv-nombre">{item.nombre}</span>
                        <span className="per-inv-tipo">{equipado ? "Equipada" : etiqueta}</span>
                      </div>
                      {!equipado && (
                        <button
                          className="per-btn-mini"
                          onClick={() => equipar(item)}
                          disabled={accionando === item.id_item}
                        >
                          {accionando === item.id_item ? (
                            <Loader2 size={13} className="per-spin" />
                          ) : (
                            <Check size={13} />
                          )}
                          Equipar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        <p className="per-vacio">Consigue más skins y fotos de perfil en la Tienda con las monedas que ganas estudiando.</p>
      </div>
    </div>
  );
}
