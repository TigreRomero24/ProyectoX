import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PenLine,
  Trash2,
  ChevronLeft,
  CheckCheck,
  X,
  Circle,
  ToggleLeft,
  List,
  Info,
} from "lucide-react";
import { api } from "../../services/api";
import "./AdminEstilos/Cargaexcel.css";

// ─── Constantes del formato ────────────────────────────────────────────────────
const COLUMNAS = [
  "enunciado",
  "opcion_a",
  "opcion_b",
  "opcion_c",
  "opcion_d",
  "correcta",
  "tipo",
];
/*
  Formato esperado del Excel (fila 1 = cabecera):
  | enunciado | opcion_a | opcion_b | opcion_c | opcion_d | correcta | tipo     |
  | ¿Qué...?  | F=ma     | E=mc2    | V=IR     | P=F/A    | A        | MULTIPLE |
  | ¿Es...?   | Verdadero| Falso    |          |          | A        | VF       |

  - correcta: "A", "B", "C" o "D"  → índice de la opción correcta
  - tipo: "MULTIPLE" o "VF" (Verdadero/Falso) — si omitido, se detecta automáticamente
  - opcion_c y opcion_d son opcionales (mínimo 2 opciones para MULTIPLE)
*/

const LETRAS = ["A", "B", "C", "D"];

// ─── Parsear fila Excel → estructura interna ───────────────────────────────────
const parsearFila = (fila, idx) => {
  const enunciado = String(fila["enunciado"] || "").trim();
  const opcion_a = String(fila["opcion_a"] || "").trim();
  const opcion_b = String(fila["opcion_b"] || "").trim();
  const opcion_c = String(fila["opcion_c"] || "").trim();
  const opcion_d = String(fila["opcion_d"] || "").trim();
  const correctaRaw = String(fila["correcta"] || "")
    .trim()
    .toUpperCase();
  const tipoRaw = String(fila["tipo"] || "")
    .trim()
    .toUpperCase();

  // Detectar tipo si no está especificado
  const tipo =
    tipoRaw === "VF" || tipoRaw === "VERDADERO_FALSO"
      ? "VERDADERO_FALSO"
      : "MULTIPLE";

  // Construir opciones según tipo
  let opciones = [];
  if (tipo === "VERDADERO_FALSO") {
    const correctaVF = correctaRaw === "B" ? "Falso" : "Verdadero";
    opciones = [
      { texto: "Verdadero", es_correcta: correctaVF === "Verdadero" },
      { texto: "Falso", es_correcta: correctaVF === "Falso" },
    ];
  } else {
    const textos = [opcion_a, opcion_b, opcion_c, opcion_d].filter(
      (t) => t !== "",
    );
    const idxCorrecta = LETRAS.indexOf(correctaRaw);
    opciones = textos.map((texto, i) => ({
      texto,
      es_correcta: i === idxCorrecta,
    }));
  }

  const errores = [];
  if (!enunciado) errores.push("Enunciado vacío");
  if (tipo === "MULTIPLE") {
    if (opciones.length < 2) errores.push("Mínimo 2 opciones");
    if (!opciones.some((o) => o.es_correcta))
      errores.push("Ninguna opción correcta (A-D inválida)");
  }

  return {
    _id: idx,
    _fila: idx + 2,
    _error: errores,
    _editando: false,
    enunciado,
    tipo_pregunta: tipo,
    opciones,
    _opcionTextos:
      tipo === "MULTIPLE"
        ? opciones.map((o) => o.texto)
        : ["Verdadero", "Falso"],
    _correctaIdx:
      tipo === "MULTIPLE"
        ? opciones.findIndex((o) => o.es_correcta)
        : opciones.find((o) => o.es_correcta)?.texto === "Falso"
          ? 1
          : 0,
  };
};

// ─── Validar una pregunta editada ──────────────────────────────────────────────
const validarPregunta = (p) => {
  const errs = [];
  if (!p.enunciado.trim()) errs.push("Enunciado vacío");
  if (p.tipo_pregunta === "MULTIPLE") {
    const validas = p._opcionTextos.filter((t) => t.trim() !== "");
    if (validas.length < 2) errs.push("Mínimo 2 opciones con texto");
    if (p._correctaIdx < 0 || p._correctaIdx >= validas.length)
      errs.push("Opción correcta inválida");
  }
  return errs;
};

// ─── Convertir pregunta interna → payload API ──────────────────────────────────
const toPayload = (p) => {
  if (p.tipo_pregunta === "VERDADERO_FALSO") {
    return {
      enunciado: p.enunciado.trim(),
      tipo_pregunta: "VERDADERO_FALSO",
      opciones: [
        { texto: "Verdadero", es_correcta: p._correctaIdx === 0 },
        { texto: "Falso", es_correcta: p._correctaIdx === 1 },
      ],
    };
  }
  const textos = p._opcionTextos.filter((t) => t.trim() !== "");
  return {
    enunciado: p.enunciado.trim(),
    tipo_pregunta: "MULTIPLE",
    opciones: textos.map((texto, i) => ({
      texto,
      es_correcta: i === p._correctaIdx,
    })),
  };
};

// ─── Generar plantilla Excel descargable ──────────────────────────────────────
const descargarPlantilla = () => {
  const datos = [
    {
      enunciado: "¿Cuál es la segunda ley de Newton?",
      opcion_a: "F = m × a",
      opcion_b: "E = mc²",
      opcion_c: "V = I × R",
      opcion_d: "P = F / A",
      correcta: "A",
      tipo: "MULTIPLE",
    },
    {
      enunciado: "¿El agua hierve a 100°C a nivel del mar?",
      opcion_a: "Verdadero",
      opcion_b: "Falso",
      opcion_c: "",
      opcion_d: "",
      correcta: "A",
      tipo: "VF",
    },
    {
      enunciado: "¿Cuánto es 2 + 2?",
      opcion_a: "3",
      opcion_b: "4",
      opcion_c: "5",
      opcion_d: "",
      correcta: "B",
      tipo: "MULTIPLE",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(datos, { header: COLUMNAS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Preguntas");
  // Ajustar anchos de columna
  ws["!cols"] = [
    { wch: 50 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
  ];
  XLSX.writeFile(wb, "plantilla_preguntas.xlsx");
};

export default function CargaExcel({
  idMateria,
  nombreMateria,
  onVolver,
  onExito,
}) {
  const inputRef = useRef(null);

  // ── Fases ──────────────────────────────────────────────────────────────────
  const [fase, setFase] = useState("drop");
  const [dragging, setDragging] = useState(false);

  // ── Datos parseados ────────────────────────────────────────────────────────
  const [preguntas, setPreguntas] = useState([]);
  const [archivoNombre, setArchivoNombre] = useState("");

  // ── Duplicados ─────────────────────────────────────────────────────────────
  const [duplicados, setDuplicados] = useState([]);

  // ── Resultado ──────────────────────────────────────────────────────────────
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState("");

  // ── Edición inline ─────────────────────────────────────────────────────────
  const [editIdx, setEditIdx] = useState(null); // índice en preguntas[]

  // ── Parsear archivo ────────────────────────────────────────────────────────
  const parsearArchivo = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorGlobal("Solo se aceptan archivos .xlsx o .xls");
      return;
    }
    setArchivoNombre(file.name);
    setErrorGlobal("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          setErrorGlobal("El archivo está vacío o no tiene datos.");
          return;
        }

        const parsed = rows.map((row, i) => parsearFila(row, i));
        setPreguntas(parsed);
        setFase("preview");
        setEditIdx(null);
      } catch (err) {
        setErrorGlobal(
          "No se pudo leer el archivo. Verifica que el formato sea correcto.",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    parsearArchivo(file);
  };

  // ── Editar pregunta inline ─────────────────────────────────────────────────
  const actualizarPregunta = (idx, campo, valor) => {
    setPreguntas((prev) => {
      const next = [...prev];
      const p = { ...next[idx], [campo]: valor };
      p._error = validarPregunta(p);
      next[idx] = p;
      return next;
    });
  };

  const actualizarOpcion = (idx, opIdx, valor) => {
    setPreguntas((prev) => {
      const next = [...prev];
      const textos = [...next[idx]._opcionTextos];
      textos[opIdx] = valor;
      const p = { ...next[idx], _opcionTextos: textos };
      p._error = validarPregunta(p);
      next[idx] = p;
      return next;
    });
  };

  const marcarCorrecta = (idx, opIdx) => {
    setPreguntas((prev) => {
      const next = [...prev];
      const p = { ...next[idx], _correctaIdx: opIdx };
      p._error = validarPregunta(p);
      next[idx] = p;
      return next;
    });
  };

  const eliminarFila = (idx) => {
    setPreguntas((prev) => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  // ── Enviar al backend ──────────────────────────────────────────────────────
  const handleEnviar = async (forzar = false) => {
    const validas = preguntas.filter((p) => p._error.length === 0);
    if (validas.length === 0) {
      setErrorGlobal(
        "No hay preguntas válidas para cargar. Corrige los errores primero.",
      );
      return;
    }

    setCargando(true);
    setErrorGlobal("");

    try {
      const payload = validas.map(toPayload);
      const res = await api.crearPreguntasBulk(idMateria, payload, forzar);
      const data = res.data;

      if (data.requiereConfirmacion) {
        setDuplicados(data.omitidas);
        setFase("duplicados");
      } else {
        setResultado(data);
        setFase("resultado");
        if (data.insertadas > 0) onExito?.();
      }
    } catch (e) {
      setErrorGlobal(e.message || "Error al cargar las preguntas.");
    } finally {
      setCargando(false);
    }
  };

  const totalValidas = preguntas.filter((p) => p._error.length === 0).length;
  const totalErrores = preguntas.filter((p) => p._error.length > 0).length;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ce-root">
      {/* ── Cabecera ──────────────────────────────────────────────────── */}
      <div className="ce-topbar">
        <button className="ce-back-btn" onClick={onVolver}>
          <ChevronLeft size={16} /> Volver
        </button>
        <div>
          <h3 className="ce-title">Carga desde Excel</h3>
          <p className="ce-subtitle">{nombreMateria}</p>
        </div>
        <button className="ce-plantilla-btn" onClick={descargarPlantilla}>
          <Download size={15} /> Descargar plantilla
        </button>
      </div>

      {/* Formato info */}
      <div className="ce-info-banner">
        <Info size={14} />
        <span>
          Formato:{" "}
          <strong>
            enunciado | opcion_a | opcion_b | opcion_c | opcion_d | correcta
            (A/B/C/D) | tipo (MULTIPLE/VF)
          </strong>
          . Descarga la plantilla para ver ejemplos.
        </span>
      </div>

      {errorGlobal && (
        <div className="ce-error-banner">
          <AlertCircle size={15} /> {errorGlobal}
          <button onClick={() => setErrorGlobal("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════ FASE: DROP ═══════════════════════════════════════════ */}
      {fase === "drop" && (
        <div
          className={`ce-dropzone${dragging ? " ce-dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={(e) => parsearArchivo(e.target.files?.[0])}
          />
          <div className="ce-drop-icon">
            <FileSpreadsheet size={40} />
          </div>
          <h4>Arrastra tu archivo Excel aquí</h4>
          <p>o haz clic para seleccionarlo</p>
          <span className="ce-drop-hint">.xlsx · .xls · máx. 200 filas</span>
        </div>
      )}

      {/* ═══════ FASE: PREVIEW ════════════════════════════════════════ */}
      {fase === "preview" && (
        <>
          {/* Resumen */}
          <div className="ce-resumen">
            <div className="ce-resumen-item ce-resumen--file">
              <FileSpreadsheet size={16} />
              {archivoNombre}
            </div>
            <div className="ce-resumen-item ce-resumen--ok">
              <CheckCircle2 size={15} />
              {totalValidas} válidas
            </div>
            {totalErrores > 0 && (
              <div className="ce-resumen-item ce-resumen--err">
                <XCircle size={15} />
                {totalErrores} con errores
              </div>
            )}
            <button
              className="ce-btn-cambiar"
              onClick={() => {
                setFase("drop");
                setPreguntas([]);
              }}
            >
              Cambiar archivo
            </button>
          </div>

          {/* Tabla de preguntas */}
          <div className="ce-tabla">
            {preguntas.map((p, idx) => (
              <div
                key={p._id}
                className={`ce-fila${p._error.length > 0 ? " ce-fila--error" : ""}${editIdx === idx ? " ce-fila--editing" : ""}`}
              >
                {/* Cabecera de fila */}
                <div className="ce-fila-header">
                  <span className="ce-fila-num">Fila {p._fila}</span>
                  <span
                    className={`ce-tipo-badge ce-tipo-${p.tipo_pregunta === "MULTIPLE" ? "mult" : "vf"}`}
                  >
                    {p.tipo_pregunta === "MULTIPLE" ? (
                      <>
                        <List size={10} /> Múltiple
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={10} /> V/F
                      </>
                    )}
                  </span>
                  {p._error.length > 0 && (
                    <span className="ce-err-badge">
                      <AlertCircle size={11} /> {p._error.join(" · ")}
                    </span>
                  )}
                  <div className="ce-fila-actions">
                    <button
                      className="ce-btn-edit"
                      onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                    >
                      <PenLine size={13} />{" "}
                      {editIdx === idx ? "Cerrar" : "Editar"}
                    </button>
                    <button
                      className="ce-btn-del"
                      onClick={() => eliminarFila(idx)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Enunciado (siempre visible) */}
                {editIdx !== idx ? (
                  <p className="ce-enunciado">
                    {p.enunciado || <em className="ce-vacio">Sin enunciado</em>}
                  </p>
                ) : (
                  <textarea
                    className="ce-input-enunciado"
                    value={p.enunciado}
                    rows={2}
                    onChange={(e) =>
                      actualizarPregunta(idx, "enunciado", e.target.value)
                    }
                    placeholder="Enunciado de la pregunta..."
                  />
                )}

                {/* Opciones — solo en modo edición */}
                {editIdx === idx && (
                  <div className="ce-opciones-edit">
                    {p.tipo_pregunta === "VERDADERO_FALSO" ? (
                      <div className="ce-vf-edit">
                        {["Verdadero", "Falso"].map((val, i) => (
                          <div
                            key={val}
                            className={`ce-vf-opt${p._correctaIdx === i ? " ce-vf-opt--active" : ""}`}
                            onClick={() => marcarCorrecta(idx, i)}
                          >
                            {p._correctaIdx === i ? (
                              <CheckCircle2 size={16} />
                            ) : (
                              <Circle size={16} />
                            )}
                            {val}
                          </div>
                        ))}
                      </div>
                    ) : (
                      p._opcionTextos.map((texto, oi) => (
                        <div key={oi} className="ce-opcion-edit-row">
                          <button
                            className={`ce-radio${p._correctaIdx === oi ? " ce-radio--active" : ""}`}
                            onClick={() => marcarCorrecta(idx, oi)}
                          >
                            {p._correctaIdx === oi ? (
                              <CheckCircle2 size={17} />
                            ) : (
                              <Circle size={17} />
                            )}
                          </button>
                          <span className="ce-letra">{LETRAS[oi]}</span>
                          <input
                            className="ce-input-opcion"
                            type="text"
                            value={texto}
                            placeholder={`Opción ${LETRAS[oi]}`}
                            onChange={(e) =>
                              actualizarOpcion(idx, oi, e.target.value)
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Opciones en modo lectura */}
                {editIdx !== idx && (
                  <div className="ce-opciones-preview">
                    {p.tipo_pregunta === "VERDADERO_FALSO" ? (
                      <>
                        {["Verdadero", "Falso"].map((val, i) => (
                          <span
                            key={val}
                            className={`ce-opcion-chip${p._correctaIdx === i ? " ce-opcion-chip--ok" : ""}`}
                          >
                            {p._correctaIdx === i && <CheckCircle2 size={11} />}{" "}
                            {val}
                          </span>
                        ))}
                      </>
                    ) : (
                      p._opcionTextos
                        .filter((t) => t)
                        .map((t, i) => (
                          <span
                            key={i}
                            className={`ce-opcion-chip${p._correctaIdx === i ? " ce-opcion-chip--ok" : ""}`}
                          >
                            {p._correctaIdx === i && <CheckCircle2 size={11} />}{" "}
                            {LETRAS[i]}. {t}
                          </span>
                        ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer acciones */}
          <div className="ce-footer">
            <span className="ce-footer-info">
              {totalErrores > 0
                ? `Se cargarán ${totalValidas} preguntas válidas. Las ${totalErrores} con errores serán ignoradas.`
                : `Se cargarán ${totalValidas} preguntas.`}
            </span>
            <button
              className="ce-btn-cargar"
              onClick={() => handleEnviar(false)}
              disabled={cargando || totalValidas === 0}
            >
              {cargando ? (
                <>
                  <div className="ce-spinner" /> Cargando...
                </>
              ) : (
                <>
                  <Upload size={16} /> Cargar {totalValidas} preguntas
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ═══════ FASE: DUPLICADOS ═════════════════════════════════════ */}
      {fase === "duplicados" && (
        <div className="ce-duplicados">
          <div className="ce-dup-icon">
            <AlertCircle size={32} />
          </div>
          <h4>Se encontraron preguntas duplicadas</h4>
          <p>
            Las siguientes {duplicados.length} pregunta
            {duplicados.length > 1 ? "s" : ""} ya existen en esta materia:
          </p>
          <div className="ce-dup-list">
            {duplicados.map((d, i) => (
              <div key={i} className="ce-dup-item">
                <span className="ce-dup-fila">Fila {d.fila}</span>
                <span className="ce-dup-texto">{d.enunciado}</span>
              </div>
            ))}
          </div>
          <p className="ce-dup-pregunta">¿Qué deseas hacer?</p>
          <div className="ce-dup-btns">
            <button
              className="ce-btn-omitir"
              onClick={() => handleEnviar(false)}
              disabled={cargando}
            >
              Omitir duplicados e insertar el resto
            </button>
            <button
              className="ce-btn-forzar"
              onClick={() => handleEnviar(true)}
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <div className="ce-spinner" /> Insertando...
                </>
              ) : (
                "Insertar todas de todas formas"
              )}
            </button>
          </div>
          <button className="ce-back-link" onClick={() => setFase("preview")}>
            <ChevronLeft size={14} /> Volver a la vista previa
          </button>
        </div>
      )}

      {/* ═══════ FASE: RESULTADO ═════════════════════════════════════ */}
      {fase === "resultado" && resultado && (
        <div className="ce-resultado">
          <div
            className={`ce-res-icon${resultado.insertadas > 0 ? " ce-res-icon--ok" : " ce-res-icon--warn"}`}
          >
            {resultado.insertadas > 0 ? (
              <CheckCheck size={32} />
            ) : (
              <AlertCircle size={32} />
            )}
          </div>
          <h4>Carga completada</h4>

          <div className="ce-res-stats">
            <div className="ce-res-stat">
              <span className="ce-res-num ce-res-num--ok">
                {resultado.insertadas}
              </span>
              <span>insertadas</span>
            </div>
            {resultado.errores?.length > 0 && (
              <div className="ce-res-stat">
                <span className="ce-res-num ce-res-num--err">
                  {resultado.errores.length}
                </span>
                <span>con errores</span>
              </div>
            )}
          </div>

          {resultado.errores?.length > 0 && (
            <div className="ce-res-errores">
              <p className="ce-res-err-title">Filas que no se insertaron:</p>
              {resultado.errores.map((e, i) => (
                <div key={i} className="ce-res-err-row">
                  <span className="ce-dup-fila">Fila {e.fila}</span>
                  <span>
                    {e.enunciado} — <em>{e.motivo}</em>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="ce-res-btns">
            <button className="ce-btn-cargar" onClick={onVolver}>
              Volver al banco de preguntas
            </button>
            <button
              className="ce-btn-omitir"
              onClick={() => {
                setFase("drop");
                setPreguntas([]);
                setResultado(null);
              }}
            >
              Cargar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
