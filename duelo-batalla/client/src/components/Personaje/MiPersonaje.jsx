import { useMemo, useState } from "react";
import { Coins, Star, Check, X, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import PersonajeSVG from "./PersonajeSVG";
import PersonajeCapas from "./PersonajeCapas";
import { ANIMALES, rutaBase, rutaItem } from "./personajeConfig";

const TIPOS_LABEL = {
  GAFAS: "Gafas",
  SOMBRERO: "Sombrero",
  CAPA: "Capa",
  MOCHILA: "Mochila",
  MARCO: "Marco",
  CABEZA: "Cabeza",
  OJOS: "Ojos",
  ESPALDA: "Espalda",
  MANO: "Mano",
  CUERPO: "Cuerpo",
};

export default function MiPersonaje({ personaje, onActualizado, onError }) {
  const [animal, setAnimal] = useState(personaje.animal || "owl");
  const [genero, setGenero] = useState(personaje.genero);
  const [tonoPiel, setTonoPiel] = useState(personaje.tono_piel);
  const [colorCabello, setColorCabello] = useState(personaje.color_cabello);
  const [colorOutfit, setColorOutfit] = useState(personaje.color_outfit);
  const [sinPng, setSinPng] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [accionando, setAccionando] = useState(null);

  const itemsPorId = useMemo(
    () => new Map(personaje.inventario.map((it) => [it.id_item, it])),
    [personaje.inventario],
  );

  const itemsEquipados = useMemo(
    () =>
      Object.values(personaje.accesorios_equipados || {})
        .map((id) => itemsPorId.get(id))
        .filter(Boolean),
    [personaje.accesorios_equipados, itemsPorId],
  );

  const colorEquipado = (tipo) => {
    const idEquipado = personaje.accesorios_equipados?.[tipo];
    return idEquipado ? itemsPorId.get(idEquipado)?.color ?? null : null;
  };

  const hayCambios =
    animal !== (personaje.animal || "owl") ||
    genero !== personaje.genero ||
    tonoPiel !== personaje.tono_piel ||
    colorCabello !== personaje.color_cabello ||
    colorOutfit !== personaje.color_outfit;

  const guardarApariencia = async () => {
    setGuardando(true);
    try {
      const res = await api.actualizarApariencia({
        animal,
        genero,
        tono_piel: tonoPiel,
        color_cabello: colorCabello,
        color_outfit: colorOutfit,
      });
      onActualizado({ ...personaje, ...res.data });
    } catch (e) {
      onError(e.message || "No se pudo guardar la apariencia.");
    } finally {
      setGuardando(false);
    }
  };

  const toggleEquipar = async (item) => {
    setAccionando(item.id_item);
    try {
      const equipadoActual = personaje.accesorios_equipados?.[item.tipo];
      const res =
        equipadoActual === item.id_item
          ? await api.desequiparItem(item.tipo)
          : await api.equiparItem(item.id_item);
      onActualizado({ ...personaje, accesorios_equipados: res.data.accesorios_equipados });
    } catch (e) {
      onError(e.message || "No se pudo actualizar el accesorio.");
    } finally {
      setAccionando(null);
    }
  };

  const xpEnNivel = personaje.xp - (personaje.nivel - 1) * 100;
  const xpPorcentaje = Math.min(100, xpEnNivel);

  const svgRespaldo = (
    <PersonajeSVG
      genero={genero}
      tonoPiel={tonoPiel}
      colorCabello={colorCabello}
      colorOutfit={colorOutfit}
      gafasColor={colorEquipado("GAFAS")}
      sombreroColor={colorEquipado("SOMBRERO")}
      capaColor={colorEquipado("CAPA")}
      mochilaColor={colorEquipado("MOCHILA")}
      marcoColor={colorEquipado("MARCO")}
      size={200}
    />
  );

  return (
    <div className="per-grid">
      <div className="per-columna per-columna--preview">
        <PersonajeCapas
          key={animal}
          animal={animal}
          items={itemsEquipados}
          size={220}
          fallback={svgRespaldo}
          onBaseError={() => setSinPng(true)}
        />

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
        <h3 className="per-subtitulo">Mascota</h3>

        <div className="per-animales">
          {ANIMALES.map((a) => (
            <button
              key={a.id}
              className={`per-animal${animal === a.id ? " activo" : ""}`}
              onClick={() => {
                setAnimal(a.id);
                setSinPng(false);
              }}
            >
              <img
                src={rutaBase(a.id)}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span>{a.nombre}</span>
            </button>
          ))}
        </div>

        {sinPng && (
          <>
            <h3 className="per-subtitulo per-subtitulo--mt">Apariencia (modo clásico)</h3>

            <div className="per-genero-toggle">
              <button
                className={genero === "MASCULINO" ? "activo" : ""}
                onClick={() => setGenero("MASCULINO")}
              >
                Hombre
              </button>
              <button
                className={genero === "FEMENINO" ? "activo" : ""}
                onClick={() => setGenero("FEMENINO")}
              >
                Mujer
              </button>
            </div>

            <div className="per-colores">
              <label>
                Piel
                <input type="color" value={tonoPiel} onChange={(e) => setTonoPiel(e.target.value)} />
              </label>
              <label>
                Cabello
                <input
                  type="color"
                  value={colorCabello}
                  onChange={(e) => setColorCabello(e.target.value)}
                />
              </label>
              <label>
                Outfit
                <input
                  type="color"
                  value={colorOutfit}
                  onChange={(e) => setColorOutfit(e.target.value)}
                />
              </label>
            </div>
          </>
        )}

        <button
          className="per-btn per-btn--primary"
          onClick={guardarApariencia}
          disabled={!hayCambios || guardando}
        >
          {guardando ? <Loader2 size={15} className="per-spin" /> : <Check size={15} />}
          Guardar
        </button>

        <h3 className="per-subtitulo per-subtitulo--mt">Mi inventario</h3>
        {personaje.inventario.length === 0 ? (
          <p className="per-vacio">
            Todavía no tienes accesorios — cómpralos en la Tienda con tus monedas.
          </p>
        ) : (
          <div className="per-inventario">
            {personaje.inventario.map((item) => {
              const equipado = personaje.accesorios_equipados?.[item.tipo] === item.id_item;
              return (
                <div key={item.id_item} className={`per-inv-item${equipado ? " equipado" : ""}`}>
                  {item.imagen ? (
                    <img className="per-inv-img" src={rutaItem(item.imagen)} alt="" />
                  ) : (
                    <span className="per-inv-swatch" style={{ background: item.color }} />
                  )}
                  <div className="per-inv-info">
                    <span className="per-inv-nombre">{item.nombre}</span>
                    <span className="per-inv-tipo">{TIPOS_LABEL[item.tipo]}</span>
                  </div>
                  <button
                    className={`per-btn-mini${equipado ? " quitar" : ""}`}
                    onClick={() => toggleEquipar(item)}
                    disabled={accionando === item.id_item}
                  >
                    {accionando === item.id_item ? (
                      <Loader2 size={13} className="per-spin" />
                    ) : equipado ? (
                      <X size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                    {equipado ? "Quitar" : "Equipar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
