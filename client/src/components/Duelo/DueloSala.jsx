import { useMemo, useState } from "react";
import { Check, Copy, Crown, LogOut, Play, User, WifiOff } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

export default function DueloSala({ codigo, participantes, onMarcarListo, onIniciar, onSalir }) {
  const { user } = useAuth();
  const [listo, setListo] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const yo = useMemo(
    () => participantes.find((p) => p.id_usuario === user?.id),
    [participantes, user?.id],
  );
  const soyCreador = !!yo?.es_creador;
  const todosListos = participantes.length >= 2 && participantes.every((p) => p.listo);

  const toggleListo = () => {
    const nuevo = !listo;
    setListo(nuevo);
    onMarcarListo(nuevo);
  };

  const copiarCodigo = () => {
    navigator.clipboard?.writeText(codigo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const iniciar = async () => {
    setError("");
    setIniciando(true);
    try {
      await onIniciar();
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciando(false);
    }
  };

  return (
    <div className="duelo-sala">
      <div className="duelo-sala-header">
        <div>
          <h2>Sala de espera</h2>
          <p>{participantes.length} / 10 participantes</p>
        </div>
        <button className="duelo-codigo-chip" onClick={copiarCodigo}>
          {copiado ? <Check size={14} /> : <Copy size={14} />} {codigo}
        </button>
      </div>

      <ul className="duelo-participantes">
        {participantes.map((p) => (
          <li key={p.id_usuario} className={`duelo-participante${p.conectado ? "" : " duelo-participante--offline"}`}>
            <div className="duelo-avatar">
              {p.url_foto ? <img src={p.url_foto} alt={p.nombre} /> : <User size={16} />}
            </div>
            <span className="duelo-participante-nombre">
              {p.nombre}
              {p.id_usuario === user?.id && " (tú)"}
            </span>
            {p.es_creador && <Crown size={14} className="duelo-icon-creador" title="Creador de la sala" />}
            {!p.conectado && <WifiOff size={14} className="duelo-icon-offline" title="Desconectado" />}
            <span className={`duelo-badge-listo${p.listo ? " listo" : ""}`}>
              {p.listo ? "Listo" : "Esperando"}
            </span>
          </li>
        ))}
      </ul>

      {error && <div className="duelo-alert duelo-alert--error">{error}</div>}

      <div className="duelo-sala-acciones">
        <button className="duelo-btn duelo-btn--ghost" onClick={onSalir}>
          <LogOut size={16} /> Salir
        </button>
        <button
          className={`duelo-btn${listo ? " duelo-btn--success" : " duelo-btn--primary"}`}
          onClick={toggleListo}
        >
          <Check size={16} /> {listo ? "Estoy listo" : "Marcarme listo"}
        </button>
        {soyCreador && (
          <button
            className="duelo-btn duelo-btn--accent"
            onClick={iniciar}
            disabled={!todosListos || iniciando}
            title={!todosListos ? "Todos deben marcarse como listos (mín. 2)" : ""}
          >
            <Play size={16} /> {iniciando ? "Iniciando..." : "Iniciar duelo"}
          </button>
        )}
      </div>
    </div>
  );
}
