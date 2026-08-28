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
  MoveUp,
  CheckCheck,
} from "lucide-react";
import OrdenarRenderer from "./OrdenarRenderer";
import CompletarRenderer from "./completar/CompletarRenderer";
import { parseCompletarText } from "./completar/completarParser";
import { 
  buildCompletarStateFromRespuesta, 
  serializeCompletarState, 
  resolveCompletarMode 
} from "./completar/completarState";
import { buildExamPayloadEntry } from "./questionRuntime";
import { api } from "../../services/api";
import { obtenerRespuestaCorrecta, obtenerRespuestaUsuario } from "./respuestaFeedback";
import ExamResultadoFX from "./ExamResultadoFX";

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
  const [detalleRespuestas, setDetalleRespuestas] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");

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

    if (p.tipo_pregunta === "SELECCION_MULTIPLE") {
      setRespuestas((prev) => {
        const actualRes = prev[p.id_pregunta] || [];
        if (actualRes.includes(opcionId)) {
          const newVal = actualRes.filter(id => id !== opcionId);
          if (newVal.length === 0) {
            const next = { ...prev };
            delete next[p.id_pregunta];
            return next;
          }
          return { ...prev, [p.id_pregunta]: newVal };
        } else {
          return { ...prev, [p.id_pregunta]: [...actualRes, opcionId] };
        }
      });
      return;
    }

    setRespuestas((prev) => ({ ...prev, [p.id_pregunta]: opcionId }));
  };

  const handleOrdenar = (ordenData) => {
    const p = preguntas[actual];
    setRespuestas(prev => ({ ...prev, [p.id_pregunta]: ordenData }));
  };

  const handleCompletar = (nuevoMap) => {
    const p = preguntas[actual];
    const mode = resolveCompletarMode(p.estructura_json);
    const { slotIds } = parseCompletarText(p.estructura_json?.texto);
    const serialized = serializeCompletarState(nuevoMap, slotIds, mode);
    setRespuestas(prev => ({ ...prev, [p.id_pregunta]: serialized }));
  };

  const handleEntregar = useCallback(
    async (porTiempo = false) => {
      if (entregadoRef.current) return;
      entregadoRef.current = true;
      clearInterval(timerRef.current);
      setConfirmar(false);
      setEntregando(true);
      setError("");

      const currentRespuestas = respuestasRef.current;
      const payload = preguntas.map(p => {
        const r = currentRespuestas[p.id_pregunta];
        return buildExamPayloadEntry(p, r ? (typeof r === 'object' ? { respuesta_json: r } : { id_opcion: r }) : null);
      }).filter(Boolean);

      try {
        const res = await api.enviarExamen(id_intento, payload);
        setResultado(res.data);

        // 🔥 NUEVO: cargar retroalimentación final (qué respondió el alumno
        // vs. la respuesta correcta, por pregunta) ahora que el examen ya
        // está FINALIZADO. enviarExamen no expone la respuesta correcta por
        // seguridad mientras el examen está en curso; getIntento sí, una vez
        // finalizado y siendo el dueño del intento.
        if (res.data?.id_intento && !res.data?.tiempo_expirado) {
          setLoadingDetalle(true);
          setErrorDetalle("");
          try {
            const detalle = await api.getIntento(res.data.id_intento);
            setDetalleRespuestas(detalle.data?.respuestas_detalle || []);
          } catch (errDetalle) {
            setErrorDetalle(
              "No se pudo cargar el detalle de tus respuestas.",
            );
          } finally {
            setLoadingDetalle(false);
          }
        }
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
        {/* 🔥 ANIMACIÓN Y SONIDO: confeti+fanfare si aprobó, lluvia+melodía
            triste si reprobó. Se auto-destruye después de ~4 segundos. */}
        <ExamResultadoFX
          aprobado={aprobado}
          tiempoExpirado={!!resultado.tiempo_expirado}
        />

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

          {/* 🔥 NUEVO: Retroalimentación final — qué respondiste vs. la
              respuesta correcta, por pregunta. Solo aplica si el examen
              se entregó normalmente (no por tiempo expirado). */}
          {!resultado.tiempo_expirado && (
            <div className="hi-detalle-respuestas" style={{ marginTop: "24px", width: "100%" }}>
              <h3 className="hi-detalle-subtitle">Retroalimentación</h3>

              {loadingDetalle ? (
                <div className="ev-state" style={{ padding: "16px 0" }}>
                  <div className="ev-spinner-sm" /> Cargando retroalimentación...
                </div>
              ) : errorDetalle ? (
                <div className="ev-error-banner">
                  <AlertCircle size={15} /> {errorDetalle}
                </div>
              ) : detalleRespuestas && detalleRespuestas.length > 0 ? (
                <div className="hi-respuestas-list">
                  {detalleRespuestas.map((resp, idx) => (
                    <div
                      key={idx}
                      className={`hi-respuesta-item ${resp.es_correcta_snapshot ? "hi-respuesta-item--ok" : "hi-respuesta-item--fail"}`}
                    >
                      <div className="hi-respuesta-header">
                        <span className="hi-respuesta-num">Pregunta {idx + 1}</span>
                        {resp.es_correcta_snapshot ? (
                          <span className="hi-respuesta-status hi-respuesta-status--ok">
                            <CheckCircle2 size={14} /> Correcta
                          </span>
                        ) : (
                          <span className="hi-respuesta-status hi-respuesta-status--fail">
                            <XCircle size={14} /> Incorrecta
                          </span>
                        )}
                      </div>
                      <p className="hi-respuesta-texto">{resp.pregunta_banco?.enunciado}</p>
                      <div className="hi-respuesta-feedback">
                        <div className="hi-feedback-row">
                          <div className="hi-feedback-item">
                            <p className="hi-feedback-label">Tu respuesta:</p>
                            <p className="hi-feedback-valor">
                              {obtenerRespuestaUsuario(resp, resp.pregunta_banco)}
                            </p>
                          </div>
                          {!resp.es_correcta_snapshot &&
                            resp.pregunta_banco &&
                            obtenerRespuestaCorrecta(resp.pregunta_banco) && (
                              <div className="hi-feedback-item hi-feedback-item--correct">
                                <p className="hi-feedback-label">Respuesta correcta:</p>
                                <p className="hi-feedback-valor">
                                  {obtenerRespuestaCorrecta(resp.pregunta_banco)}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
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
            {pregunta.tipo_pregunta === "MULTIPLE" && (
              <>
                <List size={11} /> Opción Múltiple
              </>
            )}
            {pregunta.tipo_pregunta === "SELECCION_MULTIPLE" && (
              <>
                <CheckCheck size={11} /> Selección Múltiple
              </>
            )}
            {pregunta.tipo_pregunta === "VERDADERO_FALSO" && (
              <>
                <ToggleLeft size={11} /> Verdadero / Falso
              </>
            )}
            {pregunta.tipo_pregunta === "ORDENAR" && (
              <>
                <MoveUp size={11} /> Ordenar
              </>
            )}
            {pregunta.tipo_pregunta === "COMPLETAR" && (
              <>
                <CheckCheck size={11} /> Completar
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
          {["MULTIPLE", "VERDADERO_FALSO", "SELECCION_MULTIPLE"].includes(pregunta.tipo_pregunta) && (
            pregunta.opciones.map((op, i) => {
              let seleccionada = false;
              if (pregunta.tipo_pregunta === "SELECCION_MULTIPLE") {
                seleccionada = (respuestas[pregunta.id_pregunta] || []).includes(op.id_opcion);
              } else {
                seleccionada = respuestas[pregunta.id_pregunta] === op.id_opcion;
              }

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
            })
          )}

          {pregunta.tipo_pregunta === "ORDENAR" && (
            <OrdenarRenderer 
              pregunta={pregunta}
              onReorder={handleOrdenar}
              disabled={entregando || !!resultado}
              respuestaActual={respuestas[pregunta.id_pregunta]}
            />
          )}

          {pregunta.tipo_pregunta === "COMPLETAR" && (
            <CompletarRenderer 
              estructura={pregunta.estructura_json}
              respuestaMap={buildCompletarStateFromRespuesta(respuestas[pregunta.id_pregunta])}
              onChangeMap={handleCompletar}
            />
          )}
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