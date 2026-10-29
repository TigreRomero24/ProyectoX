import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock, Users, XCircle } from "lucide-react";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

export default function DueloJuego({ pregunta, progreso, participantes, onResponder }) {
  const inicioRef = useRef(Date.now());
  const [tiempoRestanteMs, setTiempoRestanteMs] = useState(pregunta?.tiempo_limite_ms || 0);
  const [seleccionada, setSeleccionada] = useState(null);
  const [respondida, setRespondida] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Al llegar una pregunta nueva, reinicia el estado local y el reloj.
  useEffect(() => {
    inicioRef.current = Date.now();
    setTiempoRestanteMs(pregunta?.tiempo_limite_ms || 0);
    setSeleccionada(null);
    setRespondida(false);
    setFeedback(null);
  }, [pregunta?.id_pregunta, pregunta?.numero]);

  useEffect(() => {
    if (!pregunta || respondida) return;
    const intervalo = setInterval(() => {
      const restante = pregunta.tiempo_limite_ms - (Date.now() - inicioRef.current);
      setTiempoRestanteMs(Math.max(0, restante));
    }, 100);
    return () => clearInterval(intervalo);
  }, [pregunta, respondida]);

  if (!pregunta) {
    return <div className="duelo-juego-cargando">Esperando la siguiente pregunta…</div>;
  }

  const elegir = async (idOpcion) => {
    if (respondida) return;
    const tiempoMs = Date.now() - inicioRef.current;
    setSeleccionada(idOpcion);
    setRespondida(true);

    const res = await onResponder(pregunta.id_pregunta, idOpcion, tiempoMs);
    if (res?.ok) {
      setFeedback({ esCorrecta: res.es_correcta, puntos: res.puntos_obtenidos });
    }
  };

  const porcentajeTiempo = Math.round((tiempoRestanteMs / pregunta.tiempo_limite_ms) * 100);
  const tiempoUrgente = porcentajeTiempo <= 25;

  return (
    <div className="duelo-juego">
      <div className="duelo-juego-topbar">
        <span className="duelo-juego-numero">
          Pregunta {pregunta.numero} / {pregunta.total}
        </span>
        {progreso && (
          <span className="duelo-juego-progreso">
            <Users size={13} /> {progreso.totalRespuestas}/{progreso.totalParticipantes} respondieron
          </span>
        )}
      </div>

      <div className="duelo-timer-track">
        <div
          className={`duelo-timer-fill${tiempoUrgente ? " urgente" : ""}`}
          style={{ width: `${porcentajeTiempo}%` }}
        />
      </div>
      <div className="duelo-timer-label">
        <Clock size={13} /> {Math.ceil(tiempoRestanteMs / 1000)}s
      </div>

      {pregunta.url_imagen && (
        <img className="duelo-pregunta-imagen" src={pregunta.url_imagen} alt="" />
      )}
      <h3 className="duelo-pregunta-enunciado">{pregunta.enunciado}</h3>

      <div className="duelo-opciones">
        {pregunta.opciones.map((op, i) => {
          const esSeleccionada = seleccionada === op.id_opcion;
          let clase = "duelo-opcion";
          if (respondida && esSeleccionada) {
            clase += feedback?.esCorrecta ? " correcta" : " incorrecta";
          } else if (respondida) {
            clase += " deshabilitada";
          }
          return (
            <button
              key={op.id_opcion}
              className={clase}
              onClick={() => elegir(op.id_opcion)}
              disabled={respondida}
            >
              <span className="duelo-opcion-letra">{LETRAS[i]}</span>
              <span>{op.texto}</span>
              {respondida && esSeleccionada && (
                feedback?.esCorrecta
                  ? <CheckCircle2 size={18} className="duelo-opcion-icono" />
                  : <XCircle size={18} className="duelo-opcion-icono" />
              )}
            </button>
          );
        })}
      </div>

      {respondida && (
        <div className={`duelo-feedback${feedback?.esCorrecta ? " ok" : " fail"}`}>
          {feedback?.esCorrecta
            ? `¡Correcto! +${feedback.puntos} puntos`
            : "Respuesta registrada. Esperando a los demás…"}
        </div>
      )}
    </div>
  );
}
