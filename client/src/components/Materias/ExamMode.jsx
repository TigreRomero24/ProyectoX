import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Clock,
  Circle,
  CheckCircle2,
  List,
  ToggleLeft,
  AlertCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { api } from "../../services/api";
import "./Evaluacion.css";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

function ModalConfirmar({ sinResponder, onAceptar, onCancelar }) {
  return (
    <div className="ev-modal-overlay">
      <div className="ev-modal">
        <div className="ev-modal-icon">
          <AlertCircle size={28} />
        </div>
        <h3 className="ev-modal-title">¿Entregar examen?</h3>
        {sinResponder > 0 ? (
          <p className="ev-modal-msg">
            Tienes <strong>{sinResponder}</strong> pregunta
            {sinResponder > 1 ? "s" : ""} sin responder. Esta acción no se puede
            deshacer.
          </p>
        ) : (
          <p className="ev-modal-msg">
            Estás a punto de entregar el examen. Esta acción no se puede
            deshacer.
          </p>
        )}
        <div className="ev-modal-actions">
          <button
            className="ev-modal-btn ev-modal-btn--cancel"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            className="ev-modal-btn ev-modal-btn--confirm"
            onClick={onAceptar}
          >
            Entregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamMode({ examenData, nombreMateria, onVolver }) {
  const { id_intento, configuracion, preguntas } = examenData;
  const total = preguntas.length;

  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [entregando, setEntregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const tiempoInicial = configuracion?.tiempo_limite_min
    ? configuracion.tiempo_limite_min * 60
    : null;
  const [timeLeft, setTimeLeft] = useState(tiempoInicial);
  const timerRef = useRef(null);
  const entregadoRef = useRef(false);
  const respuestasRef = useRef({});
  respuestasRef.current = respuestas;

  useEffect(() => {
    if (!timeLeft) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!entregadoRef.current) handleEntregar(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const handleSeleccionar = (opcionId) => {
    if (resultado) return;
    const p = preguntas[actual];
    setRespuestas((prev) => ({ ...prev, [p.id_pregunta]: opcionId }));
  };

  const handleEntregar = useCallback(
    async (porTiempo = false) => {
      if (entregadoRef.current) return;
      entregadoRef.current = true;
      clearInterval(timerRef.current);
      setConfirmar(false);
      setEntregando(true);
      setError("");

      const respActuales = respuestasRef.current;
      const payload = Object.entries(respActuales).map(
        ([id_pregunta, id_opcion]) => ({
          id_pregunta: parseInt(id_pregunta),
          id_opcion,
        }),
      );

      try {
        const res = await api.enviarExamen(id_intento, payload);
        setResultado(res.data);
      } catch (e) {
        const msg = e.message || "";
        if (msg.includes("RESTRICCION") && msg.includes("tiempo")) {
          setError(
            "El tiempo del examen expiró. Las respuestas no pudieron ser procesadas.",
          );
        } else {
          setError(msg || "Error al entregar el examen.");
        }
        entregadoRef.current = false;
      } finally {
        setEntregando(false);
      }
    },
    [id_intento],
  );

  // ── Botón "Entregar": muestra modal si hay sin responder ──────────────────
  const solicitarEntrega = () => {
    const sinResponder = total - Object.keys(respuestas).length;
    if (sinResponder > 0) {
      setConfirmar(true);
    } else {
      handleEntregar(false);
    }
  };

  const pregunta = preguntas[actual];
  const respondidas = Object.keys(respuestas).length;
  const pct = Math.round((respondidas / total) * 100);
  const yaRespondio = !!respuestas[pregunta?.id_pregunta];
  const tiempoUrgente = timeLeft !== null && timeLeft < 120;

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTADO
  // ══════════════════════════════════════════════════════════════════════════
  if (resultado) {
    const aprobado = resultado.nota_final >= 7;
    return (
      <div className="ev-root">
        <div className="ev-resultado">
          <div
            className={`ev-resultado-icon ${aprobado ? "ev-resultado-icon--ok" : "ev-resultado-icon--fail"}`}
          >
            {aprobado ? <Trophy size={36} /> : <XCircle size={36} />}
          </div>
          <h2 className="ev-resultado-title">
            {resultado.tiempo_expirado
              ? "Tiempo agotado"
              : aprobado
                ? "¡Examen aprobado!"
                : "Examen finalizado"}
          </h2>

          <div className="ev-resultado-nota">
            <span
              className={`ev-nota-num ${aprobado ? "ev-nota--ok" : "ev-nota--fail"}`}
            >
              {resultado.nota_final}
            </span>
            <span className="ev-nota-den">/10</span>
          </div>

          {!resultado.tiempo_expirado && (
            <div className="ev-resultado-stats">
              <div className="ev-stat">
                <span className="ev-stat-val">
                  {resultado.preguntas_correctas}
                </span>
                <span className="ev-stat-label">Correctas</span>
              </div>
              <div className="ev-stat-sep" />
              <div className="ev-stat">
                <span className="ev-stat-val">
                  {resultado.total_preguntas - resultado.preguntas_correctas}
                </span>
                <span className="ev-stat-label">Incorrectas</span>
              </div>
              <div className="ev-stat-sep" />
              <div className="ev-stat">
                <span className="ev-stat-val">{resultado.porcentaje}%</span>
                <span className="ev-stat-label">Porcentaje</span>
              </div>
            </div>
          )}

          {resultado.intentos_restantes != null && (
            <p className="ev-resultado-sub">
              Intentos restantes:{" "}
              <strong>{resultado.intentos_restantes}</strong>
            </p>
          )}

          <button className="ev-btn-volver" onClick={onVolver}>
            Volver a Materias
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EXAMEN EN CURSO
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ev-root">
      {confirmar && (
        <ModalConfirmar
          sinResponder={total - Object.keys(respuestas).length}
          onAceptar={() => handleEntregar(false)}
          onCancelar={() => {
            setConfirmar(false);
            entregadoRef.current = false;
          }}
        />
      )}

      {/* Cabecera */}
      <div className="ev-topbar">
        <div className="ev-topbar-left">
          <div className="ev-mode-icon ev-mode-icon--examen">
            <BadgeCheck size={22} />
          </div>
          <div>
            <div className="ev-mode-label">{nombreMateria} — Modo Examen</div>
            <div className="ev-mode-sub">Evaluación cronometrada</div>
          </div>
        </div>
        {timeLeft !== null && (
          <div
            className={`ev-timer ${tiempoUrgente ? "ev-timer--urgente" : ""}`}
          >
            <Clock size={15} />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Progreso */}
      <div className="ev-progress-bar-wrap">
        <div className="ev-progress-labels">
          <span>Progreso</span>
          <span>
            {respondidas} de {total} respondidas
          </span>
        </div>
        <div className="ev-progress-track">
          <div
            className="ev-progress-fill ev-progress-fill--examen"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="ev-error-banner">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Pregunta */}
      <div className="ev-card">
        <div className="ev-badges">
          <span
            className="ev-badge ev-badge--num"
            style={{ background: "#059669" }}
          >
            Pregunta {actual + 1}
          </span>
          <span className="ev-badge ev-badge--tipo">
            {pregunta.tipo_pregunta === "MULTIPLE" ? (
              <>
                <List size={11} /> Opción Múltiple
              </>
            ) : (
              <>
                <ToggleLeft size={11} /> Verdadero / Falso
              </>
            )}
          </span>
          {yaRespondio && (
            <span className="ev-badge ev-badge--respondida">
              <CheckCircle2 size={11} /> Respondida
            </span>
          )}
        </div>

        <p className="ev-enunciado">{pregunta.enunciado}</p>
        {pregunta.url_imagen && (
          <img src={pregunta.url_imagen} alt="Imagen" className="ev-imagen" />
        )}

        <div className="ev-opciones">
          {pregunta.opciones.map((op, i) => {
            const seleccionada =
              respuestas[pregunta.id_pregunta] === op.id_opcion;
            return (
              <button
                key={op.id_opcion}
                className={`ev-opcion ${seleccionada ? "ev-opcion--seleccionada" : "ev-opcion--idle ev-opcion--hover"}`}
                onClick={() => handleSeleccionar(op.id_opcion)}
              >
                <span
                  className={`ev-opcion-radio ${seleccionada ? "ev-opcion-radio--seleccionada" : ""}`}
                >
                  {seleccionada ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </span>
                <span
                  className={`ev-opcion-letra ${seleccionada ? "ev-opcion-letra--seleccionada" : ""}`}
                >
                  {LETRAS[i]}
                </span>
                <span className="ev-opcion-texto">{op.texto}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navegación */}
      <div className="ev-nav">
        <button
          className="ev-nav-btn ev-nav-btn--prev"
          onClick={() => setActual((q) => Math.max(0, q - 1))}
          disabled={actual === 0}
        >
          <ChevronLeft size={18} /> Anterior
        </button>

        <div className="ev-dots">
          {preguntas.map((p, i) => (
            <button
              key={p.id_pregunta}
              className={`ev-dot
                ${i === actual ? "ev-dot--actual" : ""}
                ${respuestas[p.id_pregunta] ? "ev-dot--respondida" : ""}
              `}
              onClick={() => setActual(i)}
            />
          ))}
        </div>

        {actual < total - 1 ? (
          <button
            className="ev-nav-btn ev-nav-btn--next"
            onClick={() => setActual((q) => q + 1)}
          >
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button
            className="ev-nav-btn ev-nav-btn--finish"
            onClick={solicitarEntrega}
            disabled={entregando}
          >
            {entregando ? (
              <>
                <div className="ev-spinner-sm" /> Entregando...
              </>
            ) : (
              <>Entregar Examen</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
