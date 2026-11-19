import { Trophy } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import SkinPersonaje from "../Personaje/SkinPersonaje";

// Orden visual del podio: 2.º a la izquierda, 1.º al centro, 3.º a la derecha.
const ORDEN_PODIO = [2, 1, 3];

export default function DueloResultados({ ranking, onSalir }) {
  const { user } = useAuth();

  if (!ranking) return null;

  const podio = ORDEN_PODIO.map((pos) => ranking.find((r) => r.posicion === pos)).filter(Boolean);
  const resto = ranking.filter((r) => r.posicion > 3);
  const esYo = (r) => r.id_usuario === user?.id;

  return (
    <div className="duelo-resultados">
      <div className="duelo-resultados-header">
        <Trophy size={28} />
        <h2>¡Duelo finalizado!</h2>
      </div>

      <div className="duelo-podio">
        {podio.map((r) => (
          <div
            key={r.id_usuario}
            className={`duelo-podio-col duelo-podio-col--${r.posicion}${esYo(r) ? " duelo-podio-col--yo" : ""}`}
          >
            <SkinPersonaje className="duelo-podio-skin" imagen={r.skin} alt={r.nombre} />
            <span className="duelo-podio-nombre">
              {r.nombre}
              {esYo(r) && " (tú)"}
            </span>
            <span className="duelo-podio-puntaje">{r.puntaje} pts</span>
            <div className="duelo-podio-base">
              <span className="duelo-podio-numero">{r.posicion}</span>
              <span className="duelo-podio-aciertos">{r.respuestas_correctas} aciertos</span>
            </div>
          </div>
        ))}
      </div>

      {resto.length > 0 && (
        <ol className="duelo-ranking">
          {resto.map((r) => (
            <li key={r.id_usuario} className={`duelo-ranking-item${esYo(r) ? " duelo-ranking-item--yo" : ""}`}>
              <span className="duelo-ranking-posicion">#{r.posicion}</span>
              <SkinPersonaje className="duelo-ranking-skin" imagen={r.skin} alt={r.nombre} />
              <span className="duelo-ranking-nombre">
                {r.nombre}
                {esYo(r) && " (tú)"}
              </span>
              <span className="duelo-ranking-correctas">{r.respuestas_correctas} aciertos</span>
              <span className="duelo-ranking-puntaje">{r.puntaje} pts</span>
            </li>
          ))}
        </ol>
      )}

      <button className="duelo-btn duelo-btn--primary" onClick={onSalir}>
        Volver al lobby
      </button>
    </div>
  );
}
