import { useState } from "react";
import { Music2, ChevronDown, ChevronUp, Volume2, VolumeX, X } from "lucide-react";
import { extraerYoutubeId } from "../../utils/youtube";
import BuscadorYoutube from "../Musica/BuscadorYoutube";
import "./LeccionMusica.css";

const STORAGE_KEY = "eq_leccion_musica_video_id";

export default function LeccionMusica() {
  const [videoId, setVideoId] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [minimizado, setMinimizado] = useState(false);
  const [muted, setMuted] = useState(true);

  const elegirCancion = (id) => {
    const idLimpio = extraerYoutubeId(id) || id;
    setVideoId(idLimpio);
    localStorage.setItem(STORAGE_KEY, idLimpio);
  };

  const quitar = () => {
    setVideoId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className={`leccion-musica${minimizado ? " minimizado" : ""}`}>
      <div className="leccion-musica-header" onClick={() => setMinimizado((m) => !m)}>
        <Music2 size={14} />
        <span>Música</span>
        {minimizado ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>

      {!minimizado && (
        <div className="leccion-musica-body">
          {videoId ? (
            <>
              <iframe
                className="leccion-musica-frame"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${videoId}&modestbranding=1&rel=0`}
                title="Música de fondo"
                allow="autoplay; encrypted-media"
              />
              <button className="leccion-musica-mute" onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {muted ? "Activar sonido" : "Silenciar"}
              </button>
            </>
          ) : (
            <p className="leccion-musica-vacio">Estudia con tu música favorita.</p>
          )}

          <div className="leccion-musica-form">
            <BuscadorYoutube onSeleccionar={elegirCancion} placeholder="Buscar canción…" />
            {videoId && (
              <button type="button" className="leccion-musica-quitar" onClick={quitar} title="Quitar música">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
