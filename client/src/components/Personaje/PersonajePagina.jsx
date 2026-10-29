import { useEffect, useState } from "react";
import { UserCircle2, Store, AlertCircle } from "lucide-react";
import { api } from "../../services/api";
import MiPersonaje from "./MiPersonaje";
import Tienda from "./Tienda";
import "./Personaje.css";

export default function PersonajePagina() {
  const [tab, setTab] = useState("mi-personaje");
  const [personaje, setPersonaje] = useState(null);
  const [tienda, setTienda] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargarPersonaje = () =>
    api
      .getPersonaje()
      .then((res) => setPersonaje(res.data))
      .catch((e) => setError(e.message || "Error al cargar tu personaje."));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      cargarPersonaje(),
      api.getTienda().then((res) => setTienda(res.data || [])),
    ])
      .catch((e) => setError(e.message || "Error al cargar."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="per-estado">
        <div className="per-spinner" />
        <span>Cargando tu personaje...</span>
      </div>
    );
  }

  return (
    <div className="per-root">
      <div className="per-header">
        <h2 className="per-titulo">Mi Personaje</h2>
        <p className="per-subtitulo">
          Gana monedas estudiando y úsalas para personalizarte.
        </p>
      </div>

      {error && (
        <div className="per-error-banner">
          <AlertCircle size={15} />
          {error}
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      <div className="per-tabs">
        <button
          className={`per-tab${tab === "mi-personaje" ? " activa" : ""}`}
          onClick={() => setTab("mi-personaje")}
        >
          <UserCircle2 size={15} /> Mi Personaje
        </button>
        <button
          className={`per-tab${tab === "tienda" ? " activa" : ""}`}
          onClick={() => setTab("tienda")}
        >
          <Store size={15} /> Tienda
        </button>
      </div>

      {personaje && tab === "mi-personaje" && (
        <MiPersonaje
          personaje={personaje}
          onActualizado={setPersonaje}
          onError={setError}
        />
      )}

      {personaje && tab === "tienda" && (
        <Tienda
          personaje={personaje}
          tienda={tienda}
          onCompra={cargarPersonaje}
          onError={setError}
        />
      )}
    </div>
  );
}
