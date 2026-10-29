import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  FileText,
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

// ─── Constantes del formato ────────────────────────────────────────────────────
const COLUMNAS = [
  "enunciado",
  "opcion_a",
  "opcion_b",
  "opcion_c",
  "opcion_d",
  "correcta",
  "tipo",
  "imagen",
];
/*
  Formato esperado del Excel (fila 1 = cabecera):
  | enunciado | opcion_a | opcion_b | opcion_c | opcion_d | correcta | tipo     | imagen |
  | ¿Qué...?  | F=ma     | E=mc2    | V=IR     | P=F/A    | A        | MULTIPLE |        |
  | ¿Cuáles?  | 2        | 3        | 4        | 5        | A,B      | SM       |        |
  | ¿Es...?   | Verdadero| Falso    |          |          | A        | VF       | si     |

  - correcta: "A".."D"; en selección múltiple varias separadas por coma ("A,C")
  - tipo: "MULTIPLE", "SM" (selección múltiple) o "VF" — si se omite, se
    detecta: varias correctas → SM, si no → MULTIPLE
  - imagen: cualquier valor (ej. "si") marca que la pregunta lleva imagen; la
    fila queda en rojo hasta adjuntarla en la vista previa
  - opcion_c y opcion_d son opcionales (mínimo 2 opciones)
*/

const LETRAS = ["A", "B", "C", "D"];

const TIPO_POR_TEXTO = {
  VF: "VERDADERO_FALSO",
  VERDADERO_FALSO: "VERDADERO_FALSO",
  SM: "SELECCION_MULTIPLE",
  SELECCION: "SELECCION_MULTIPLE",
  SELECCION_MULTIPLE: "SELECCION_MULTIPLE",
  MULTIPLE: "MULTIPLE",
};

// ─── Validar una pregunta (al leerla y al editarla) ────────────────────────────
const validarPregunta = (p) => {
  const errs = [];
  if (!p.enunciado.trim()) errs.push("Enunciado vacío");
  if (p.tipo_pregunta !== "VERDADERO_FALSO") {
    const validas = p._opcionTextos.filter((t) => t.trim() !== "");
    if (validas.length < 2) errs.push("Mínimo 2 opciones con texto");
    const correctas = p._correctas.filter((i) => i < validas.length);
    if (correctas.length === 0) errs.push("Marca la opción correcta");
    else if (p.tipo_pregunta === "MULTIPLE" && correctas.length > 1)
      errs.push("Opción múltiple admite una sola correcta (usa tipo SM)");
  } else if (p._correctas.length !== 1) {
    errs.push("Elige Verdadero o Falso");
  }
  if (p._requiereImagen && !p._imagen) errs.push("Lleva imagen: adjúntala");
  return errs;
};

// ─── Parsear fila Excel → estructura interna ───────────────────────────────────
const parsearFila = (fila, idx) => {
  const texto = (campo) => String(fila[campo] || "").trim();
  const enunciado = texto("enunciado");
  // "A,C", "a c" o "AC" → [0, 2]
  const letras = [
    ...new Set(texto("correcta").toUpperCase().match(/[A-D]/g) || []),
  ];
  const tipo =
    TIPO_POR_TEXTO[texto("tipo").toUpperCase()] ||
    (letras.length > 1 ? "SELECCION_MULTIPLE" : "MULTIPLE");

  const opcionTextos =
    tipo === "VERDADERO_FALSO"
      ? ["Verdadero", "Falso"]
      : [texto("opcion_a"), texto("opcion_b"), texto("opcion_c"), texto("opcion_d")].filter(
          (t) => t !== "",
        );

  const p = {
    _id: idx,
    _fila: idx + 2,
    _editando: false,
    _requiereImagen: texto("imagen") !== "",
    _imagen: null,
    enunciado,
    tipo_pregunta: tipo,
    _opcionTextos: opcionTextos,
    _correctas: letras.map((l) => LETRAS.indexOf(l)).sort(),
  };
  // V/F solo admite A (Verdadero) o B (Falso)
  if (tipo === "VERDADERO_FALSO") p._correctas = p._correctas.filter((i) => i < 2);
  p._error = validarPregunta(p);
  return p;
};

// ─── Convertir pregunta interna → payload API ──────────────────────────────────
const toPayload = (p) => {
  const textos = p._opcionTextos.filter((t) => t.trim() !== "");
  const opciones = textos.map((texto, i) => ({
    texto,
    es_correcta: p._correctas.includes(i),
  }));
  const payload = {
    enunciado: p.enunciado.trim(),
    tipo_pregunta: p.tipo_pregunta,
    opciones,
  };
  // Igual que GestionPreguntas: el modo práctica corrige SM con esta clave.
  if (p.tipo_pregunta === "SELECCION_MULTIPLE") {
    payload.estructura_json = {
      tipo: "SELECCION_MULTIPLE",
      opciones: opciones.map((o, i) => ({ opcion_id: LETRAS[i], texto: o.texto })),
      respuesta: {
        opciones_ids: opciones.flatMap((o, i) => (o.es_correcta ? [LETRAS[i]] : [])),
      },
    };
  }
  return payload;
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
    {
      enunciado: "¿Cuáles son números primos?",
      opcion_a: "2",
      opcion_b: "3",
      opcion_c: "4",
      opcion_d: "9",
      correcta: "A,B",
      tipo: "SM",
    },
    {
      enunciado: "Observa la figura: ¿qué figura geométrica es?",
      opcion_a: "Triángulo",
      opcion_b: "Cuadrado",
      opcion_c: "",
      opcion_d: "",
      correcta: "A",
      tipo: "MULTIPLE",
      imagen: "si",
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
    { wch: 10 },
  ];
  XLSX.writeFile(wb, "plantilla_preguntas.xlsx");
};

export default function CargaExcel({
  soloPdf = false,
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
  const [leyendoPdf, setLeyendoPdf] = useState(false);

  // ── PDF: la IA devuelve filas con las mismas columnas que la plantilla ─────
  const parsearPdf = async (file) => {
    setArchivoNombre(file.name);
    setErrorGlobal("");
    setLeyendoPdf(true);
    try {
      const res = await api.extraerPreguntasPdf(file);
      // Sin respuesta en el PDF → la fila queda en rojo hasta marcarla.
      const parsed = (res.data || []).map((fila, i) => parsearFila(fila, i));
      setPreguntas(parsed);
      setFase("preview");
      setEditIdx(null);
    } catch (err) {
      setErrorGlobal(err.message || "No se pudo leer el PDF.");
    } finally {
      setLeyendoPdf(false);
    }
  };

  // ── Parsear archivo ────────────────────────────────────────────────────────
  const parsearArchivo = (file) => {
    if (!file || leyendoPdf) return;
    if (soloPdf) {
      if (/\.pdf$/i.test(file.name)) parsearPdf(file);
      else setErrorGlobal("Solo se aceptan archivos .pdf");
      return;
    }
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
      const actual = next[idx];
      // Selección múltiple alterna; el resto deja una sola correcta.
      const _correctas =
        actual.tipo_pregunta === "SELECCION_MULTIPLE"
          ? actual._correctas.includes(opIdx)
            ? actual._correctas.filter((i) => i !== opIdx)
            : [...actual._correctas, opIdx].sort()
          : [opIdx];
      const p = { ...actual, _correctas };
      p._error = validarPregunta(p);
      next[idx] = p;
      return next;
    });
  };

  const eliminarFila = (idx) => {
    setPreguntas((prev) => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  const adjuntarImagen = (idx, file) => {
    if (file && !file.type.startsWith("image/")) {
      setErrorGlobal("La imagen debe ser un archivo de imagen (png, jpg, webp…).");
      return;
    }
    setPreguntas((prev) => {
      const next = [...prev];
      const p = { ...next[idx], _imagen: file || null };
      p._error = validarPregunta(p);
      next[idx] = p;
      return next;
    });
  };

  // ── Enviar al backend ──────────────────────────────────────────────────────
  // modo: "revisar" (avisa duplicados), "omitir" (salta duplicados) o
  // "forzar" (inserta todo). Los duplicados se detectan aquí, con la misma
  // regla del servidor, para cubrir también las preguntas con imagen, que no
  // pasan por la carga masiva.
  const handleEnviar = async (modo = "revisar") => {
    let validas = preguntas.filter((p) => p._error.length === 0);
    if (validas.length === 0) {
      setErrorGlobal(
        "No hay preguntas válidas para cargar. Corrige los errores primero.",
      );
      return;
    }

    setCargando(true);
    setErrorGlobal("");

    try {
      if (modo !== "forzar") {
        const res = await api.getPreguntasPorMateria(idMateria, false);
        const clave = (t) => String(t || "").trim().toLowerCase();
        const existentes = new Set((res.data || []).map((q) => clave(q.enunciado)));
        const dup = validas.filter((p) => existentes.has(clave(p.enunciado)));

        if (dup.length > 0 && modo === "revisar") {
          setDuplicados(dup.map((p) => ({ fila: p._fila, enunciado: p.enunciado })));
          setFase("duplicados");
          return;
        }
        validas = validas.filter((p) => !dup.includes(p));
      }

      const omitidas = preguntas.filter((p) => p._error.length === 0).length - validas.length;
      let data = { insertadas: 0, omitidas: [], errores: [] };

      // La carga masiva es JSON: las preguntas con imagen van una a una por
      // el endpoint normal, que sí acepta archivo.
      const sinImagen = validas.filter((p) => !p._imagen);
      const conImagen = validas.filter((p) => p._imagen);

      if (sinImagen.length > 0) {
        const res = await api.crearPreguntasBulk(
          idMateria,
          sinImagen.map(toPayload),
          modo === "forzar",
        );
        // Solo pasa si alguien agregó la misma pregunta mientras tanto.
        if (res.data.requiereConfirmacion) {
          setDuplicados(res.data.omitidas);
          setFase("duplicados");
          return;
        }
        data = { ...res.data, errores: res.data.errores || [] };
      }

      for (const p of conImagen) {
        try {
          await api.crearPregunta({ ...toPayload(p), id_materia: idMateria, imagen: p._imagen });
          data.insertadas++;
        } catch (err) {
          data.errores.push({
            fila: p._fila,
            enunciado: p.enunciado,
            motivo: (err.message || "Error al crear").replace("VALIDACION: ", ""),
          });
        }
      }

      setResultado({ ...data, omitidasCount: omitidas });
      setFase("resultado");
      if (data.insertadas > 0) onExito?.();
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
          <h3 className="ce-title">{soloPdf ? "Importar PDF con IA" : "Carga desde Excel"}</h3>
          <p className="ce-subtitle">{nombreMateria}</p>
        </div>
        {!soloPdf && (
          <button className="ce-plantilla-btn" onClick={descargarPlantilla}>
            <Download size={15} /> Descargar plantilla
          </button>
        )}
      </div>

      {/* Formato info */}
      <div className="ce-info-banner">
        <Info size={14} />
        {soloPdf ? (
          <span>
            La IA extrae preguntas de <strong>opción múltiple, selección múltiple y V/F</strong>.
            Revisa cada una antes de guardar: las que no indiquen la respuesta o lleven
            imagen saldrán en rojo hasta que las completes.
          </span>
        ) : (
          <span>
            Formato:{" "}
            <strong>
              enunciado | opcion_a | opcion_b | opcion_c | opcion_d | correcta
              (A/B/C/D; varias con coma en SM) | tipo (MULTIPLE/SM/VF) | imagen (opcional)
            </strong>
            . Descarga la plantilla para ver ejemplos.
          </span>
        )}
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
            accept={soloPdf ? ".pdf" : ".xlsx,.xls"}
            style={{ display: "none" }}
            onChange={(e) => parsearArchivo(e.target.files?.[0])}
          />
          <div className="ce-drop-icon">
            {soloPdf ? <FileText size={40} /> : <FileSpreadsheet size={40} />}
          </div>
          {leyendoPdf ? (
            <>
              <h4>Leyendo el PDF con IA…</h4>
              <p>Puede tardar de 1 a 4 minutos si la IA está saturada.</p>
            </>
          ) : (
            <>
              <h4>{soloPdf ? "Arrastra tu PDF aquí" : "Arrastra tu archivo Excel aquí"}</h4>
              <p>o haz clic para seleccionarlo</p>
            </>
          )}
          <span className="ce-drop-hint">
            {soloPdf ? ".pdf · máx. 15 MB · 200 preguntas" : ".xlsx · .xls · máx. 200 filas"}
          </span>
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
                    className={`ce-tipo-badge ce-tipo-${p.tipo_pregunta === "VERDADERO_FALSO" ? "vf" : "mult"}`}
                  >
                    {p.tipo_pregunta === "MULTIPLE" ? (
                      <>
                        <List size={10} /> Múltiple
                      </>
                    ) : p.tipo_pregunta === "SELECCION_MULTIPLE" ? (
                      <>
                        <CheckCheck size={10} /> Selección
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

                {/* Imagen: obligatoria si el Excel/PDF la marca, opcional en edición */}
                {(p._requiereImagen || p._imagen || editIdx === idx) && (
                  <label className="ce-imagen-row">
                    <Upload size={13} />
                    {p._imagen ? `Imagen: ${p._imagen.name}` : "Adjuntar imagen"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => adjuntarImagen(idx, e.target.files?.[0])}
                    />
                  </label>
                )}

                {/* Opciones — solo en modo edición */}
                {editIdx === idx && (
                  <div className="ce-opciones-edit">
                    {p.tipo_pregunta === "VERDADERO_FALSO" ? (
                      <div className="ce-vf-edit">
                        {["Verdadero", "Falso"].map((val, i) => (
                          <div
                            key={val}
                            className={`ce-vf-opt${p._correctas.includes(i) ? " ce-vf-opt--active" : ""}`}
                            onClick={() => marcarCorrecta(idx, i)}
                          >
                            {p._correctas.includes(i) ? (
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
                            className={`ce-radio${p._correctas.includes(oi) ? " ce-radio--active" : ""}`}
                            onClick={() => marcarCorrecta(idx, oi)}
                          >
                            {p._correctas.includes(oi) ? (
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
                            className={`ce-opcion-chip${p._correctas.includes(i) ? " ce-opcion-chip--ok" : ""}`}
                          >
                            {p._correctas.includes(i) && <CheckCircle2 size={11} />}{" "}
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
                            className={`ce-opcion-chip${p._correctas.includes(i) ? " ce-opcion-chip--ok" : ""}`}
                          >
                            {p._correctas.includes(i) && <CheckCircle2 size={11} />}{" "}
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
              onClick={() => handleEnviar()}
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
              onClick={() => handleEnviar("omitir")}
              disabled={cargando}
            >
              Omitir duplicados e insertar el resto
            </button>
            <button
              className="ce-btn-forzar"
              onClick={() => handleEnviar("forzar")}
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
            {resultado.omitidasCount > 0 && (
              <div className="ce-res-stat">
                <span className="ce-res-num">{resultado.omitidasCount}</span>
                <span>duplicadas omitidas</span>
              </div>
            )}
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
