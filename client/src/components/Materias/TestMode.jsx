import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Circle,
  BookOpen,
  Trophy,
  RotateCcw,
} from "lucide-react";
import "./Evaluacion.css";
import {
  corregirRespuestaTest,
  getTipoLabel,
  normalizarPregunta,
  validateCompletarRuntimeConfig,
} from "./questionRuntime";
import CompletarRenderer from "./completar/CompletarRenderer";
import {
  buildCompletarStateFromRespuesta,
  serializeCompletarState,
  resolveCompletarMode,
} from "./completar/completarState";

export default function TestMode({ preguntas, nombreMateria, onVolver }) {
  const preguntasNorm = useMemo(
    () => (preguntas || []).map(normalizarPregunta),
    [preguntas],
  );

  const [actual, setActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [feedback, setFeedback] = useState({});
  const [mostrarResumen, setMostrarResumen] = useState(false);

  const pregunta = preguntasNorm[actual];
  const total = preguntasNorm.length;
  const respondidas = Object.keys(respuestas).length;

  const evaluarAhora = (id_pregunta, respuestaActual) => {
    const p = preguntasNorm.find((x) => x.id_pregunta === id_pregunta);
    if (!p || !respuestaActual) return;
    const result = corregirRespuestaTest(p, respuestaActual);
    setFeedback((prev) => ({
      ...prev,
      [id_pregunta]: result,
    }));
  };

  const setRespuesta = (id_pregunta, payload) => {
    setRespuestas((prev) => ({
      ...prev,
      [id_pregunta]: payload,
    }));
    evaluarAhora(id_pregunta, payload);
  };

  const handleLegacy = (opcion_id) => {
    setRespuesta(pregunta.id_pregunta, {
      respuesta_json: { opcion_id },
    });
  };

  const fb = feedback[pregunta?.id_pregunta];
  const yaRespondio = !!respuestas[pregunta?.id_pregunta];
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;

  const correctas = Object.values(feedback).filter((f) => f.correcto).length;
  const sinResponder = total - respondidas;
  const porcentaje = total > 0 ? Math.round((correctas / total) * 100) : 0;

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
          <p className="ev-resultado-sub">{nombreMateria} — Modo Test</p>
          <div className="ev-resultado-nota">
            <span className={`ev-nota-num ${aprobado ? "ev-nota--ok" : "ev-nota--fail"}`}>
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
              <span className="ev-stat-val">{sinResponder}</span>
              <span className="ev-stat-label">Sin responder</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="ev-btn-volver"
              style={{ background: "#f3f4f6", color: "#374151" }}
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

  const estructura = pregunta?.estructura_json || {};
  const completarIssue = validateCompletarRuntimeConfig(pregunta);

  return (
    <div className="ev-root">
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

      <div className="ev-progress-bar-wrap">
        <div className="ev-progress-labels">
          <span>Progreso</span>
          <span>
            {respondidas} de {total} respondidas
          </span>
        </div>
        <div className="ev-progress-track">
          <div className="ev-progress-fill ev-progress-fill--test" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="ev-card">
        <div className="ev-badges">
          <span className="ev-badge ev-badge--num">Pregunta {actual + 1}</span>
          <span className="ev-badge ev-badge--tipo">{getTipoLabel(pregunta.tipo_pregunta)}</span>
          {yaRespondio && (
            <span className={`ev-badge ${fb.correcto ? "ev-badge--ok" : "ev-badge--fail"}`}>
              {fb.correcto ? (
                <>
                  <CheckCircle2 size={11} /> Correcta
                </>
              ) : (
                <>
                  <XCircle size={11} /> {fb.puntos > 0 ? "Parcial" : "Incorrecta"}
                </>
              )}
            </span>
          )}
        </div>

        <p className="ev-enunciado">{pregunta.enunciado}</p>
        {pregunta.url_imagen && <img src={pregunta.url_imagen} alt="Imagen" className="ev-imagen" />}

        {(pregunta.tipo_pregunta === "MULTIPLE" || pregunta.tipo_pregunta === "VERDADERO_FALSO") && (
          <div className="ev-opciones">
            {(estructura.opciones || []).map((op) => {
              const seleccion = respuestas[pregunta.id_pregunta]?.respuesta_json?.opcion_id === op.opcion_id;
              const esCorrecta = fb?.correcta === op.opcion_id;
              const esIncorrecta = seleccion && yaRespondio && !esCorrecta;
              return (
                <button
                  key={op.opcion_id}
                  className={`ev-opcion ${esCorrecta ? "ev-opcion--correcta" : esIncorrecta ? "ev-opcion--incorrecta" : "ev-opcion--idle ev-opcion--hover"}`}
                  onClick={() => handleLegacy(op.opcion_id)}
                >
                  <span className={`ev-opcion-radio ${seleccion ? "ev-opcion-radio--seleccionada" : ""}`}>
                    {seleccion ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </span>
                  <span className="ev-opcion-texto">{op.texto}</span>
                </button>
              );
            })}
          </div>
        )}

        {pregunta.tipo_pregunta === "SELECCION_MULTIPLE" && (
          <div className="ev-opciones">
            {(estructura.opciones || []).map((op) => {
              const actualSel =
                respuestas[pregunta.id_pregunta]?.respuesta_json?.opciones_ids || [];
              const checked = actualSel.includes(op.opcion_id);
              return (
                <button
                  key={op.opcion_id}
                  className={`ev-opcion ${checked ? "ev-opcion--seleccionada" : "ev-opcion--idle ev-opcion--hover"}`}
                  onClick={() => {
                    const set = new Set(actualSel);
                    if (set.has(op.opcion_id)) set.delete(op.opcion_id);
                    else set.add(op.opcion_id);
                    setRespuesta(pregunta.id_pregunta, {
                      respuesta_json: { opciones_ids: [...set] },
                    });
                  }}
                >
                  <span className={`ev-opcion-radio ${checked ? "ev-opcion-radio--seleccionada" : ""}`}>
                    {checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </span>
                  <span className="ev-opcion-texto">{op.texto}</span>
                </button>
              );
            })}
          </div>
        )}

        {pregunta.tipo_pregunta === "ORDENAR" && (
          <div className="ev-opciones">
            {(respuestas[pregunta.id_pregunta]?.respuesta_json?.orden_ids ||
              (estructura.items || []).map((i) => i.item_id)
            ).map((id, idx, arr) => {
              const item = (estructura.items || []).find((i) => i.item_id === id);
              return (
                <div key={id} className="ev-opcion ev-opcion--idle">
                  <span className="ev-opcion-letra">{idx + 1}</span>
                  <span className="ev-opcion-texto">{item?.texto || id}</span>
                  <>
                    <button
                      className="ev-salir-btn"
                      disabled={idx === 0}
                      onClick={() => {
                        const copy = [...arr];
                        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                        setRespuesta(pregunta.id_pregunta, {
                          respuesta_json: { orden_ids: copy },
                        });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      className="ev-salir-btn"
                      disabled={idx === arr.length - 1}
                      onClick={() => {
                        const copy = [...arr];
                        [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                        setRespuesta(pregunta.id_pregunta, {
                          respuesta_json: { orden_ids: copy },
                        });
                      }}
                    >
                      ↓
                    </button>
                  </>
                </div>
              );
            })}
          </div>
        )}

        {pregunta.tipo_pregunta === "RELACIONAR" && (
          <div className="ev-opciones">
            {(estructura.izquierda || []).map((izq) => {
              const actualPares = respuestas[pregunta.id_pregunta]?.respuesta_json?.pares || [];
              const actual = actualPares.find((p) => p.izquierda_id === izq.izquierda_id);
              return (
                <div key={izq.izquierda_id} className="ev-opcion ev-opcion--idle">
                  <span className="ev-opcion-texto" style={{ minWidth: 160 }}>
                    {izq.texto}
                  </span>
                  <select
                    className="ev-salir-btn"
                    value={actual?.derecha_id || ""}
                    onChange={(e) => {
                      const copy = actualPares.filter((p) => p.izquierda_id !== izq.izquierda_id);
                      copy.push({ izquierda_id: izq.izquierda_id, derecha_id: e.target.value });
                      setRespuesta(pregunta.id_pregunta, {
                        respuesta_json: { pares: copy },
                      });
                    }}
                  >
                    <option value="">Selecciona</option>
                    {(estructura.derecha || []).map((d) => (
                      <option key={d.derecha_id} value={d.derecha_id}>
                        {d.texto}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}

        {pregunta.tipo_pregunta === "COMPLETAR" && (
          completarIssue ? (
            <div className="ev-feedback ev-feedback--fail">
              <XCircle size={16} />
              <div>
                <strong>Configuración inválida</strong>
                <p className="ev-feedback-sub">
                  [{completarIssue.code}] {completarIssue.message}
                </p>
              </div>
            </div>
          ) : (
            <CompletarRenderer
              estructura={estructura}
              respuestaMap={buildCompletarStateFromRespuesta(
                respuestas[pregunta.id_pregunta]?.respuesta_json,
              )}
              onChangeMap={(nextMap) => {
                const slotIds = (estructura.espacios || []).map((esp) => esp.espacio_id);
                setRespuesta(pregunta.id_pregunta, {
                  respuesta_json: serializeCompletarState(
                    nextMap,
                    slotIds,
                    resolveCompletarMode(estructura),
                  ),
                });
              }}
            />
          )
        )}

        {yaRespondio && (
          <div className={`ev-feedback ${fb.correcto ? "ev-feedback--ok" : "ev-feedback--fail"}`}>
            {fb.correcto ? (
              <>
                <CheckCircle2 size={16} /> <strong>¡Correcto!</strong>
              </>
            ) : (
              <>
                <XCircle size={16} />
                <div>
                  <strong>{fb.puntos > 0 ? "Respuesta parcial" : "Incorrecto"}</strong>
                  <p className="ev-feedback-sub">Puntaje: {(fb.puntos * 100).toFixed(0)}%</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="ev-nav">
        <button
          className="ev-nav-btn ev-nav-btn--prev"
          onClick={() => setActual((q) => Math.max(0, q - 1))}
          disabled={actual === 0}
        >
          <ChevronLeft size={18} /> Anterior
        </button>

        <div className="ev-dots">
          {preguntasNorm.map((p, i) => (
            <button
              key={p.id_pregunta}
              className={`ev-dot ${i === actual ? "ev-dot--actual" : ""} ${feedback[p.id_pregunta]?.correcto === true ? "ev-dot--ok" : ""} ${feedback[p.id_pregunta]?.correcto === false ? "ev-dot--fail" : ""}`}
              onClick={() => setActual(i)}
            />
          ))}
        </div>

        {actual < total - 1 ? (
          <button className="ev-nav-btn ev-nav-btn--next" onClick={() => setActual((q) => q + 1)}>
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button className="ev-nav-btn ev-nav-btn--finish" onClick={() => setMostrarResumen(true)}>
            Ver Resultados
          </button>
        )}
      </div>
    </div>
  );
}
