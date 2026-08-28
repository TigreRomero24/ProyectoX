import { Medal, Trophy, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const COLOR_POSICION = { 1: "#f59e0b", 2: "#94a3b8", 3: "#b45309" };

export default function DueloResultados({ ranking, onSalir }) {
  const { user } = useAuth();

  if (!ranking) return null;

  return (
    <div className="duelo-resultados">
      <div className="duelo-resultados-header">
        <Trophy size={28} />
        <h2>¡Duelo finalizado!</h2>
      </div>

      <ol className="duelo-ranking">
        {ranking.map((r) => (
          <li
            key={r.id_usuario}
            className={`duelo-ranking-item${r.id_usuario === user?.id ? " duelo-ranking-item--yo" : ""}`}
          >
            <span className="duelo-ranking-posicion" style={{ color: COLOR_POSICION[r.posicion] }}>
              {r.posicion <= 3 ? <Medal size={18} /> : `#${r.posicion}`}
            </span>
            <div className="duelo-avatar">
              {r.url_foto ? <img src={r.url_foto} alt={r.nombre} /> : <User size={16} />}
            </div>
            <span className="duelo-ranking-nombre">
              {r.nombre}{r.id_usuario === user?.id && " (tú)"}
            </span>
            <span className="duelo-ranking-correctas">{r.respuestas_correctas} aciertos</span>
            <span className="duelo-ranking-puntaje">{r.puntaje} pts</span>
          </li>
        ))}
      </ol>

      <button className="duelo-btn duelo-btn--primary" onClick={onSalir}>
        Volver al lobby
      </button>
    </div>
  );
}
