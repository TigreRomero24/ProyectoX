import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Music2 } from "lucide-react";
import { api } from "../../services/api";
import "./BuscadorYoutube.css";

export default function BuscadorYoutube({ onSeleccionar, placeholder = "Buscar canción…" }) {
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }
    const timeout = setTimeout(() => {
      setBuscando(true);
      setError("");
      api
        .buscarMusica(query)
        .then((res) => {
          setResultados(res.data || []);
          setAbierto(true);
        })
        .catch((e) => setError(e.message || "No se pudo buscar."))
        .finally(() => setBuscando(false));
    }, 450);
    return () => clearTimeout(timeout);
  }, [query]);

  // Cierra el dropdown al hacer clic afuera.
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const elegir = (resultado) => {
    onSeleccionar(resultado.id, resultado.titulo);
    setQuery("");
    setResultados([]);
    setAbierto(false);
  };

  return (
    <div className="byt-root" ref={contenedorRef}>
      <div className="byt-input-wrap">
        <Search size={13} className="byt-input-icon" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
        />
        {buscando && <Loader2 size={13} className="byt-spin" />}
      </div>

      {error && <p className="byt-error">{error}</p>}

      {abierto && resultados.length > 0 && (
        <ul className="byt-resultados">
          {resultados.map((r) => (
            <li key={r.id} onClick={() => elegir(r)}>
              {r.miniatura ? (
                <img src={r.miniatura} alt="" className="byt-miniatura" />
              ) : (
                <div className="byt-miniatura byt-miniatura--vacia">
                  <Music2 size={14} />
                </div>
              )}
              <div className="byt-resultado-texto">
                <span className="byt-resultado-titulo">{r.titulo}</span>
                <span className="byt-resultado-canal">{r.canal}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
