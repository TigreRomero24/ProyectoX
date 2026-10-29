import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Layers,
  PartyPopper,
  RotateCcw as IconRepetir,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import "./Flashcards.css";

const TIPOS_SOPORTADOS = new Set(["MULTIPLE", "VERDADERO_FALSO", "SELECCION_MULTIPLE"]);

const mezclar = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default function Flashcards({ preguntas, nombreMateria, onVolver }) {
  const preguntasValidas = useMemo(
    () => preguntas.filter((p) => TIPOS_SOPORTADOS.has(p.tipo_pregunta) && p.opciones?.length),
    [preguntas],
  );

  const [mazo, setMazo] = useState(() => mezclar(preguntasValidas));
  const [volteada, setVolteada] = useState(false);
  const [dominadas, setDominadas] = useState(0);
  const [totalRondas, setTotalRondas] = useState(preguntasValidas.length);

  const actual = mazo[0];
  const restantes = mazo.length;
  const progreso = totalRondas > 0 ? Math.round((dominadas / totalRondas) * 100) : 0;

  const reiniciar = () => {
    setMazo(mezclar(preguntasValidas));
    setDominadas(0);
    setTotalRondas(preguntasValidas.length);
    setVolteada(false);
  };

  const marcar = (laSabe) => {
    setMazo((prev) => {
      const [, ...resto] = prev;
      return laSabe ? resto : [...resto, prev[0]];
    });
    if (laSabe) setDominadas((d) => d + 1);
    setVolteada(false);
  };

  if (preguntasValidas.length === 0) {
    return (
      <div className="flash-root">
        <button className="flash-volver" onClick={onVolver}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flash-vacio">
          <Layers size={32} />
          <p>Esta materia no tiene preguntas aptas para repaso rápido todavía.</p>
          <span>(Las de tipo Ordenar o Completar no se muestran acá.)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flash-root">
      <div className="flash-topbar">
        <button className="flash-volver" onClick={onVolver}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flash-titulo">
          <Layers size={16} /> Repaso relámpago · {nombreMateria}
        </div>
      </div>

      <div className="flash-progreso-track">
        <div className="flash-progreso-fill" style={{ width: `${progreso}%` }} />
      </div>
      <div className="flash-progreso-label">
        {dominadas} / {totalRondas} dominadas · quedan {restantes} en el mazo
      </div>

      {restantes === 0 ? (
        <div className="flash-final">
          <PartyPopper size={40} />
          <h3>¡Mazo completado!</h3>
          <p>Dominaste las {totalRondas} tarjetas de esta ronda.</p>
          <button className="flash-btn flash-btn--primary" onClick={reiniciar}>
            <IconRepetir size={16} /> Repasar de nuevo
          </button>
        </div>
      ) : (
        <>
          <div
            className={`flash-card${volteada ? " volteada" : ""}`}
            onClick={() => setVolteada((v) => !v)}
          >
            <div className="flash-card-inner">
              <div className="flash-card-cara flash-card-frente">
                <span className="flash-card-tipo">{actual.tipo_pregunta.replace("_", " ")}</span>
                {actual.url_imagen && (
                  <img src={actual.url_imagen} alt="" className="flash-card-imagen" />
                )}
                <p className="flash-card-enunciado">{actual.enunciado}</p>
                <span className="flash-card-hint">
                  <RotateCw size={13} /> Toca para ver la respuesta
                </span>
              </div>
              <div className="flash-card-cara flash-card-reverso">
                <span className="flash-card-tipo">Respuesta</span>
                <ul className="flash-card-respuestas">
                  {actual.opciones
                    .filter((o) => o.es_correcta)
                    .map((o) => (
                      <li key={o.id_opcion}>
                        <CheckCircle2 size={16} /> {o.texto}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>

          {volteada && (
            <div className="flash-acciones">
              <button className="flash-btn flash-btn--fail" onClick={() => marcar(false)}>
                <ThumbsDown size={16} /> Repasar de nuevo
              </button>
              <button className="flash-btn flash-btn--ok" onClick={() => marcar(true)}>
                <ThumbsUp size={16} /> Ya me la sé
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
