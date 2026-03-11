import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Circle,
  List,
  ToggleLeft,
  BookOpen,
  Trophy,
  RotateCcw,
} from "lucide-react";
import "./Evaluacion.css";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

export default function TestMode({ preguntas, nombreMateria, onVolver }) {
  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [feedback, setFeedback] = useState({});
  const [mostrarResumen, setMostrarResumen] = useState(false);

  const pregunta = preguntas[actual];
  const total = preguntas.length;
  const respondidas = Object.keys(respuestas).length;

  // ── Seleccionar respuesta con feedback inmediato ───────────────────────────
  const handleSeleccionar = (opcionId) => {
    if (feedback[pregunta.id_pregunta]) return;

    const opcionCorrecta = pregunta.opciones.find((o) => o.es_correcta);
    const esCorrecta = opcionId === opcionCorrecta?.id_opcion;

    setRespuestas((prev) => ({ ...prev, [pregunta.id_pregunta]: opcionId }));
    setFeedback((prev) => ({
      ...prev,
      [pregunta.id_pregunta]: {
        correcto: esCorrecta,
        opcionElegida: opcionId,
        opcionCorrecta: opcionCorrecta?.id_opcion,
        textoCorrecta: opcionCorrecta?.texto,
      },
    }));
  };

  const fb = feedback[pregunta?.id_pregunta];
  const yaRespondio = !!fb;

  const estadoOpcion = (op) => {
    if (!yaRespondio) return "idle";
    if (op.id_opcion === fb.opcionCorrecta) return "correcta";
    if (op.id_opcion === fb.opcionElegida && !fb.correcto) return "incorrecta";
    return "idle";
  };

  const pct = Math.round((respondidas / total) * 100);

  // ── Calcular resultados ────────────────────────────────────────────────────
  const correctas = Object.values(feedback).filter((f) => f.correcto).length;
  const incorrectas = Object.values(feedback).filter((f) => !f.correcto).length;
  const sinResponder = total - respondidas;
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // PANTALLA DE RESUMEN
  // ══════════════════════════════════════════════════════════════════════════
  if (mostrarResumen) {
    const aprobado = porcentaje >= 70;
    return (
      <div className="ev-root">
        <div className="ev-resultado">
          <div
            className={`ev-resultado-icon ${aprobado ? "ev-resultado-icon--ok" : "ev-resultado-icon--fail"}`}
          >
            {aprobado ? <Trophy size={36} /> : <BookOpen size={36} />}
          </div>

          <h2 className="ev-resultado-title">
            {aprobado ? "¡Buen trabajo!" : "Evaluación completada"}
          </h2>
          <p
            style={{
              color: "#6b7280",
              fontSize: "0.9rem",
              marginBottom: "8px",
            }}
          >
            {nombreMateria} — Modo Evaluación
          </p>

          <div className="ev-resultado-nota">
            <span
              className={`ev-nota-num ${aprobado ? "ev-nota--ok" : "ev-nota--fail"}`}
            >
              {porcentaje}
            </span>
            <span className="ev-nota-den">%</span>
          </div>

          <div className="ev-resultado-stats">
            <div className="ev-stat">
              <span className="ev-stat-val" style={{ color: "#16a34a" }}>
                {correctas}
              </span>
              <span className="ev-stat-label">Correctas</span>
            </div>
            <div className="ev-stat-sep" />
            <div className="ev-stat">
              <span className="ev-stat-val" style={{ color: "#ef4444" }}>
                {incorrectas}
              </span>
              <span className="ev-stat-label">Incorrectas</span>
            </div>
            {sinResponder > 0 && (
              <>
                <div className="ev-stat-sep" />
                <div className="ev-stat">
                  <span className="ev-stat-val" style={{ color: "#f59e0b" }}>
                    {sinResponder}
                  </span>
                  <span className="ev-stat-label">Sin responder</span>
                </div>
              </>
            )}
            <div className="ev-stat-sep" />
            <div className="ev-stat">
              <span className="ev-stat-val">{total}</span>
              <span className="ev-stat-label">Total</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "8px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              className="ev-btn-volver"
              style={{
                background: "#f3f4f6",
                color: "#374151",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => {
                setMostrarResumen(false);
                setActual(0);
                setRespuestas({});
                setFeedback({});
              }}
            >
              <RotateCcw size={16} /> Repetir
            </button>
            <button className="ev-btn-volver" onClick={onVolver}>
              Volver a Materias
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CUESTIONARIO EN CURSO
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ev-root">
      {/* ── Cabecera ──────────────────────────────────────────────────── */}
      <div className="ev-topbar">
        <div className="ev-topbar-left">
          <div className="ev-mode-icon ev-mode-icon--test">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="ev-mode-label">Modo Evaluación</div>
            <div className="ev-mode-sub">{nombreMateria}</div>
          </div>
        </div>
        <button className="ev-salir-btn" onClick={onVolver}>
          Salir
        </button>
      </div>

      {/* ── Barra de progreso ─────────────────────────────────────────── */}
      <div className="ev-progress-bar-wrap">
        <div className="ev-progress-labels">
          <span>Progreso</span>
          <span>
            {respondidas} de {total} respondidas
          </span>
        </div>
        <div className="ev-progress-track">
          <div
            className="ev-progress-fill ev-progress-fill--test"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Tarjeta pregunta ──────────────────────────────────────────── */}
      <div className="ev-card">
        <div className="ev-badges">
          <span className="ev-badge ev-badge--num">Pregunta {actual + 1}</span>
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
            <span
              className={`ev-badge ${fb.correcto ? "ev-badge--ok" : "ev-badge--fail"}`}
            >
              {fb.correcto ? (
                <>
                  <CheckCircle2 size={11} /> Correcta
                </>
              ) : (
                <>
                  <XCircle size={11} /> Incorrecta
                </>
              )}
            </span>
          )}
        </div>

        <p className="ev-enunciado">{pregunta.enunciado}</p>
        {pregunta.url_imagen && (
          <img src={pregunta.url_imagen} alt="Imagen" className="ev-imagen" />
        )}

        <div className="ev-opciones">
          {pregunta.opciones.map((op, i) => {
            const estado = estadoOpcion(op);
            return (
              <button
                key={op.id_opcion}
                className={`ev-opcion ev-opcion--${estado}${!yaRespondio ? " ev-opcion--hover" : ""}`}
                onClick={() => handleSeleccionar(op.id_opcion)}
                disabled={yaRespondio}
              >
                <span className={`ev-opcion-radio ev-opcion-radio--${estado}`}>
                  {estado === "correcta" ? (
                    <CheckCircle2 size={20} />
                  ) : estado === "incorrecta" ? (
                    <XCircle size={20} />
                  ) : (
                    <Circle size={20} />
                  )}
                </span>
                <span className={`ev-opcion-letra ev-opcion-letra--${estado}`}>
                  {LETRAS[i]}
                </span>
                <span className="ev-opcion-texto">{op.texto}</span>
              </button>
            );
          })}
        </div>

        {yaRespondio && (
          <div
            className={`ev-feedback ${fb.correcto ? "ev-feedback--ok" : "ev-feedback--fail"}`}
          >
            {fb.correcto ? (
              <>
                <CheckCircle2 size={16} /> <strong>¡Correcto!</strong>
              </>
            ) : (
              <>
                <XCircle size={16} />
                <div>
                  <strong>Incorrecto</strong>
                  <p className="ev-feedback-sub">
                    La respuesta correcta es: {fb.textoCorrecta}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Navegación ────────────────────────────────────────────────── */}
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
                ${feedback[p.id_pregunta]?.correcto === true ? "ev-dot--ok" : ""}
                ${feedback[p.id_pregunta]?.correcto === false ? "ev-dot--fail" : ""}
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
            onClick={() => setMostrarResumen(true)}
          >
            Ver Resultados
          </button>
        )}
      </div>
    </div>
  );
}
