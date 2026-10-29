import { useState } from "react";
import { Music2, ChevronDown, ChevronUp, Volume2, VolumeX, X } from "lucide-react";
import BuscadorYoutube from "../Musica/BuscadorYoutube";

export default function DueloMusica({ youtubeVideoId, esCreador, onCambiarMusica }) {
  const [minimizado, setMinimizado] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState("");

  // Sin música y sin permisos para configurarla: no hay nada que mostrar.
  if (!youtubeVideoId && !esCreador) return null;

  const elegirCancion = async (id) => {
    setError("");
    try {
      await onCambiarMusica(id);
    } catch (err) {
      setError(err.message);
    }
  };

  const quitar = async () => {
    setError("");
    try {
      await onCambiarMusica(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={`duelo-musica${minimizado ? " minimizado" : ""}`}>
      <div className="duelo-musica-header" onClick={() => setMinimizado((m) => !m)}>
        <Music2 size={14} />
        <span>Música</span>
        {minimizado ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {!minimizado && (
        <div className="duelo-musica-body">
          {youtubeVideoId ? (
            <>
              <iframe
                className="duelo-musica-frame"
                src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${youtubeVideoId}&modestbranding=1&rel=0`}
                title="Música del duelo"
                allow="autoplay; encrypted-media"
              />
              <button className="duelo-musica-mute" onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {muted ? "Activar sonido" : "Silenciar"}
              </button>
            </>
          ) : (
            <p className="duelo-musica-vacio">Sin música configurada.</p>
          )}

          {esCreador && (
            <div className="duelo-musica-form">
              <BuscadorYoutube onSeleccionar={elegirCancion} placeholder="Buscar canción…" />
              {youtubeVideoId && (
                <button type="button" className="duelo-musica-quitar" onClick={quitar} title="Quitar música">
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {error && <p className="duelo-musica-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
