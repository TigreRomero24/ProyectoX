import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Clock,
  Circle,
  CheckCircle2,
  AlertCircle,
  Trophy,
  XCircle,
} from "lucide-react";
import { api } from "../../services/api";
import "./Evaluacion.css";
import {
  buildExamPayloadEntry,
  getTipoLabel,
  normalizarPregunta,
  validateCompletarRuntimeConfig,
} from "./questionRuntime";
import CompletarRenderer from "./completar/CompletarRenderer";
import {
  buildCompletarStateFromRespuesta,
  resolveCompletarMode,
  serializeCompletarState,
} from "./completar/completarState";
import {
  formatCompletarRespuestaCorrecta,
  formatCompletarRespuestaRevision,
} from "./completar/completarFeedback";

const formatTime = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const formatRespuestaRevision = (pregunta, detalle) => {
  if (!detalle) return "Sin respuesta";

  if (pregunta.tipo_pregunta === "MULTIPLE" || pregunta.tipo_pregunta === "VERDADERO_FALSO") {
    const opcion = (pregunta.opciones || []).find(
      (o) => o.id_opcion === detalle.id_opcion_elegida,
    );
    return opcion?.texto || "Sin respuesta";
  }

  if (pregunta.tipo_pregunta === "SELECCION_MULTIPLE") {
    const seleccionadas = detalle.respuesta_json?.opciones_ids || [];
    const texto = (pregunta.estructura_json?.opciones || [])
      .filter((o) => seleccionadas.includes(o.opcion_id))
      .map((o) => o.texto);
    return texto.length ? texto.join(", ") : "Sin respuesta";
  }

  if (pregunta.tipo_pregunta === "ORDENAR") {
    const orden = detalle.respuesta_json?.orden_ids || [];
    const texto = orden.map((id) => {
      const item = (pregunta.estructura_json?.items || []).find(
        (it) => it.item_id === id,
      );
      return item?.texto || id;
    });
    return texto.length ? texto.join(" > ") : "Sin respuesta";
  }

  if (pregunta.tipo_pregunta === "RELACIONAR") {
    const pares = detalle.respuesta_json?.pares || [];
    const texto = pares.map((par) => {
      const izq = (pregunta.estructura_json?.izquierda || []).find(
        (i) => i.izquierda_id === par.izquierda_id,
      );
      const der = (pregunta.estructura_json?.derecha || []).find(
        (d) => d.derecha_id === par.derecha_id,
      );
      return `${izq?.texto || par.izquierda_id} -> ${der?.texto || par.derecha_id}`;
    });
    return texto.length ? texto.join(" | ") : "Sin respuesta";
  }

  return formatCompletarRespuestaRevision(detalle);
};

const formatRespuestaCorrectaRevision = (pregunta, detalle) => {
  const correcta = detalle?.respuesta_correcta;
  if (!correcta) return "No disponible";

  if (pregunta.tipo_pregunta === "MULTIPLE" || pregunta.tipo_pregunta === "VERDADERO_FALSO") {
    const opcion = (pregunta.estructura_json?.opciones || []).find(
      (o) => o.opcion_id === correcta.opcion_id,
    );
    return opcion?.texto || correcta.texto || "No disponible";
  }

  if (pregunta.tipo_pregunta === "SELECCION_MULTIPLE") {
    const ids = correcta.opciones_ids || [];
    const texto = (pregunta.estructura_json?.opciones || [])
      .filter((o) => ids.includes(o.opcion_id))
      .map((o) => o.texto);
    return texto.length ? texto.join(", ") : "No disponible";
  }

  if (pregunta.tipo_pregunta === "ORDENAR") {
    const orden = correcta.orden_ids || [];
    const texto = orden.map((id) => {
      const item = (pregunta.estructura_json?.items || []).find(
        (it) => it.item_id === id,
      );
      return item?.texto || id;
    });
    return texto.length ? texto.join(" > ") : "No disponible";
  }

  if (pregunta.tipo_pregunta === "RELACIONAR") {
    const pares = correcta.pares || [];
    const texto = pares.map((par) => {
      const izq = (pregunta.estructura_json?.izquierda || []).find(
        (i) => i.izquierda_id === par.izquierda_id,
      );
      const der = (pregunta.estructura_json?.derecha || []).find(
        (d) => d.derecha_id === par.derecha_id,
      );
      return `${izq?.texto || par.izquierda_id} -> ${der?.texto || par.derecha_id}`;
    });
    return texto.length ? texto.join(" | ") : "No disponible";
  }

  return formatCompletarRespuestaCorrecta(detalle);
};

function ModalConfirmar({ sinResponder, onAceptar, onCancelar }) {
  return (
    <div className="ev-modal-overlay">
      <div className="ev-modal">
        <div className="ev-modal-icon">
          <AlertCircle size={28} />
        </div>
        <h3 className="ev-modal-title">¿Entregar examen?</h3>
        <p className="ev-modal-msg">
          {sinResponder > 0 ? (
            <>
              Tienes <strong>{sinResponder}</strong> pregunta{sinResponder > 1 ? "s" : ""} sin
              responder.
            </>
          ) : (
            "Estás a punto de entregar el examen."
          )}
        </p>
        <div className="ev-modal-actions">
          <button className="ev-modal-btn ev-modal-btn--cancel" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="ev-modal-btn ev-modal-btn--confirm" onClick={onAceptar}>
            Entregar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExamMode({ examenData, nombreMateria, onVolver }) {
  const preguntas = useMemo(
    () => (examenData?.preguntas || []).map(normalizarPregunta),
    [examenData],
  );
  const { id_intento, configuracion } = examenData;
  const total = preguntas.length;

  const progresoInicial = examenData?.progreso || {};
  const respuestasIniciales =
    progresoInicial.respuestas && typeof progresoInicial.respuestas === "object"
      ? progresoInicial.respuestas
      : {};
  const indiceInicial = Number.isInteger(progresoInicial.indice_actual)
    ? progresoInicial.indice_actual
    : 0;

  const [actual, setActual] = useState(() =>
    Math.min(Math.max(indiceInicial, 0), Math.max(total - 1, 0)),
  );
  const [respuestas, setRespuestas] = useState(respuestasIniciales);
  const [entregando, setEntregando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const tiempoInicial =
    typeof examenData?.tiempo_restante_seg === "number"
      ? Math.max(examenData.tiempo_restante_seg, 0)
      : configuracion?.tiempo_limite_min
        ? configuracion.tiempo_limite_min * 60
        : null;
  const [timeLeft, setTimeLeft] = useState(tiempoInicial);
  const timerRef = useRef(null);
  const autosaveRef = useRef(null);
  const autosaveInFlightRef = useRef(false);
  const entregadoRef = useRef(false);
  const respuestasRef = useRef({});
  const entregarRef = useRef(() => {});
  respuestasRef.current = respuestas;

  const setRespuesta = (id_pregunta, payload) => {
    setRespuestas((prev) => ({ ...prev, [id_pregunta]: payload }));
  };

  const handleEntregar = useCallback(async () => {
      if (entregadoRef.current) return;
      entregadoRef.current = true;
      clearInterval(timerRef.current);
      clearTimeout(autosaveRef.current);
      setConfirmar(false);
      setEntregando(true);
      setError("");

      const runtimeIssue = preguntas.find((p) => validateCompletarRuntimeConfig(p));
      if (runtimeIssue) {
        const detalle = validateCompletarRuntimeConfig(runtimeIssue);
        setError(`[${detalle.code}] ${detalle.message}`);
        setEntregando(false);
        entregadoRef.current = false;
        return;
      }

      const payload = preguntas
        .filter((p) => respuestasRef.current[p.id_pregunta])
        .map((p) => buildExamPayloadEntry(p, respuestasRef.current[p.id_pregunta]));

      try {
        const res = await api.enviarExamen(id_intento, payload);
        setResultado(res.data);
      } catch (e) {
        setError(e.message || "Error al entregar el examen.");
        entregadoRef.current = false;
      } finally {
        setEntregando(false);
      }
    },
    [id_intento, preguntas]);

  useEffect(() => {
    entregarRef.current = handleEntregar;
  }, [handleEntregar]);

  useEffect(() => {
    if (!tiempoInicial) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!entregadoRef.current) entregarRef.current(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [tiempoInicial]);

  useEffect(() => {
    if (resultado || entregadoRef.current || !id_intento) return;

    clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(async () => {
      if (autosaveInFlightRef.current || entregadoRef.current) return;
      autosaveInFlightRef.current = true;
      try {
        await api.guardarProgresoExamen(id_intento, {
          respuestas,
          indice_actual: actual,
        });
      } catch {
        // Silencioso: la entrega final sigue siendo la fuente de verdad.
      } finally {
        autosaveInFlightRef.current = false;
      }
    }, 700);

    return () => clearTimeout(autosaveRef.current);
  }, [actual, id_intento, respuestas, resultado]);

  const solicitarEntrega = () => {
    const sinResponder = total - Object.keys(respuestas).length;
    if (sinResponder > 0) setConfirmar(true);
    else handleEntregar();
  };

  const pregunta = preguntas[actual];
  const estructura = pregunta?.estructura_json || {};
  const completarIssue = validateCompletarRuntimeConfig(pregunta);
  const respondidas = Object.keys(respuestas).length;
  const pct = total > 0 ? Math.round((respondidas / total) * 100) : 0;
  const yaRespondio = !!respuestas[pregunta?.id_pregunta];
  const tiempoUrgente = timeLeft !== null && timeLeft < 120;

  const revision = useMemo(() => {
    if (!resultado) return [];
    const detallePorPregunta = new Map(
      (resultado.detalle || []).map((det) => [det.id_pregunta, det]),
    );

    return preguntas.map((preg, idx) => {
      const det = detallePorPregunta.get(preg.id_pregunta) || null;
      return {
        id: preg.id_pregunta,
        indice: idx + 1,
        enunciado: preg.enunciado,
        tipo: getTipoLabel(preg.tipo_pregunta),
        respondida: !!det,
        correcta: det?.es_correcta === true,
        parcial: !!det && det.es_correcta !== true && Number(det.puntos_obtenidos || 0) > 0,
        respuesta: formatRespuestaRevision(preg, det),
        respuestaCorrecta: formatRespuestaCorrectaRevision(preg, det),
        puntos: Number(det?.puntos_obtenidos || 0),
      };
    });
  }, [preguntas, resultado]);

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
            <span className={`ev-nota-num ${aprobado ? "ev-nota--ok" : "ev-nota--fail"}`}>
              {resultado.nota_final}
            </span>
            <span className="ev-nota-den">/10</span>
          </div>
          {revision.length > 0 && (
            <div className="ev-revision">
              <h3 className="ev-revision-title">Revision de preguntas</h3>
              <div className="ev-revision-list">
                {revision.map((item) => (
                  <div key={item.id} className="ev-revision-item">
                    <div className="ev-revision-head">
                      <span className="ev-revision-num">#{item.indice}</span>
                      <span className="ev-revision-tipo">{item.tipo}</span>
                      <span
                        className={`ev-revision-estado ${
                          !item.respondida
                            ? "ev-revision-estado--nr"
                            : item.correcta
                              ? "ev-revision-estado--ok"
                              : "ev-revision-estado--fail"
                        }`}
                      >
                        {!item.respondida
                          ? "Sin responder"
                          : item.correcta
                            ? "Correcta"
                            : item.parcial
                              ? "Parcial"
                              : "Incorrecta"}
                      </span>
                    </div>
                    <p className="ev-revision-enunciado">{item.enunciado}</p>
                    <p className="ev-revision-respuesta">Tu respuesta: {item.respuesta}</p>
                    {item.respondida && !item.correcta && (
                      <p className="ev-revision-respuesta">
                        Respuesta correcta: {item.respuestaCorrecta}
                      </p>
                    )}
                    {item.respondida && (
                      <p className="ev-revision-puntos">
                        Puntaje: {(item.puntos * 100).toFixed(0)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <button className="ev-btn-volver" onClick={onVolver}>
            Volver a Materias
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ev-root">
      {confirmar && (
        <ModalConfirmar
          sinResponder={total - Object.keys(respuestas).length}
          onAceptar={handleEntregar}
          onCancelar={() => {
            setConfirmar(false);
            entregadoRef.current = false;
          }}
        />
      )}

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
          <div className={`ev-timer ${tiempoUrgente ? "ev-timer--urgente" : ""}`}>
            <Clock size={15} /> {formatTime(timeLeft)}
          </div>
        )}
      </div>

      <div className="ev-progress-bar-wrap">
        <div className="ev-progress-labels">
          <span>Progreso</span>
          <span>
            {respondidas} de {total} respondidas
          </span>
        </div>
        <div className="ev-progress-track">
          <div className="ev-progress-fill ev-progress-fill--examen" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {error && (
        <div className="ev-error-banner">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div className="ev-card">
        <div className="ev-badges">
          <span className="ev-badge ev-badge--num" style={{ background: "#059669" }}>
            Pregunta {actual + 1}
          </span>
          <span className="ev-badge ev-badge--tipo">{getTipoLabel(pregunta.tipo_pregunta)}</span>
          {yaRespondio && (
            <span className="ev-badge ev-badge--respondida">
              <CheckCircle2 size={11} /> Respondida
            </span>
          )}
        </div>

        <p className="ev-enunciado">{pregunta.enunciado}</p>
        {pregunta.url_imagen && <img src={pregunta.url_imagen} alt="Imagen" className="ev-imagen" />}

        {(pregunta.tipo_pregunta === "MULTIPLE" || pregunta.tipo_pregunta === "VERDADERO_FALSO") && (
          <div className="ev-opciones">
            {(estructura.opciones || []).map((op) => {
              const selected =
                respuestas[pregunta.id_pregunta]?.respuesta_json?.opcion_id === op.opcion_id;
              return (
                <button
                  key={op.opcion_id}
                  className={`ev-opcion ${selected ? "ev-opcion--seleccionada" : "ev-opcion--idle ev-opcion--hover"}`}
                  onClick={() =>
                    setRespuesta(pregunta.id_pregunta, {
                      id_opcion: (pregunta.opciones || []).find((o) => o.texto === op.texto)?.id_opcion,
                      respuesta_json: { opcion_id: op.opcion_id },
                    })
                  }
                >
                  <span className={`ev-opcion-radio ${selected ? "ev-opcion-radio--seleccionada" : ""}`}>
                    {selected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
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
              const sel = respuestas[pregunta.id_pregunta]?.respuesta_json?.opciones_ids || [];
              const checked = sel.includes(op.opcion_id);
              return (
                <button
                  key={op.opcion_id}
                  className={`ev-opcion ${checked ? "ev-opcion--seleccionada" : "ev-opcion--idle ev-opcion--hover"}`}
                  onClick={() => {
                    const set = new Set(sel);
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
                </div>
              );
            })}
          </div>
        )}

        {pregunta.tipo_pregunta === "RELACIONAR" && (
          <div className="ev-opciones">
            {(estructura.izquierda || []).map((izq) => {
              const pares = respuestas[pregunta.id_pregunta]?.respuesta_json?.pares || [];
              const actualPar = pares.find((p) => p.izquierda_id === izq.izquierda_id);
              return (
                <div key={izq.izquierda_id} className="ev-opcion ev-opcion--idle">
                  <span className="ev-opcion-texto" style={{ minWidth: 160 }}>
                    {izq.texto}
                  </span>
                  <select
                    className="ev-salir-btn"
                    value={actualPar?.derecha_id || ""}
                    onChange={(e) => {
                      const copy = pares.filter((p) => p.izquierda_id !== izq.izquierda_id);
                      copy.push({ izquierda_id: izq.izquierda_id, derecha_id: e.target.value });
                      setRespuesta(pregunta.id_pregunta, { respuesta_json: { pares: copy } });
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
          {preguntas.map((p, i) => (
            <button
              key={p.id_pregunta}
              className={`ev-dot ${i === actual ? "ev-dot--actual" : ""} ${respuestas[p.id_pregunta] ? "ev-dot--respondida" : ""}`}
              onClick={() => setActual(i)}
            />
          ))}
        </div>

        {actual < total - 1 ? (
          <button className="ev-nav-btn ev-nav-btn--next" onClick={() => setActual((q) => q + 1)}>
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button className="ev-nav-btn ev-nav-btn--finish" onClick={solicitarEntrega} disabled={entregando}>
            {entregando ? "Entregando..." : "Entregar Examen"}
          </button>
        )}
      </div>
    </div>
  );
}
