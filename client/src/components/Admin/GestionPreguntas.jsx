import { useState, useEffect } from "react";
import {
  FileQuestion,
  TableProperties,
  PenLine,
  X,
  ChevronLeft,
  List,
  ToggleLeft,
  Plus,
  Trash2,
  Circle,
  CheckCircle2,
  Wrench,
  BookOpen,
  AlertCircle,
  CheckCheck,
  ChevronDown,
  ArrowLeft,
  Settings,
} from "lucide-react";
import { api } from "../../services/api";
import CargaExcel from "./Cargaexcel";

const VISTA = {
  LISTA: "lista",
  CONFIG: "config",
  MODO: "modo",
  TIPO: "tipo",
  FORM: "form",
  EXCEL: "excel",
};
const TIPO_P = {
  MULTIPLE: "MULTIPLE",
  VF: "VERDADERO_FALSO",
  SELECCION_MULTIPLE: "SELECCION_MULTIPLE",
  ORDENAR: "ORDENAR",
  COMPLETAR: "COMPLETAR",
};
const nuevaOpcion = () => ({
  texto: "",
  es_correcta: false,
  _id: Math.random(),
});
const opcionesVF = (correcta = "Verdadero") => [
  { texto: "Verdadero", es_correcta: correcta === "Verdadero", _id: 1 },
  { texto: "Falso", es_correcta: correcta === "Falso", _id: 2 },
];
const nuevoElementoOrdenar = () => ({
  texto: "",
  orden: 0,
  _id: Math.random(),
});
const nuevoEspacioCompletar = () => ({
  label: "",
  respuestas: [],
  _id: Math.random(),
});

// ═════════════════════════════════════════════════════════════════════════════
export default function GestionPreguntas() {
  // ── Materias ───────────────────────────────────────────────────────────────
  const [materias, setMaterias] = useState([]);
  const [loadingMaterias, setLoadingMaterias] = useState(true);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  // ── Preguntas ──────────────────────────────────────────────────────────────
  const [preguntas, setPreguntas] = useState([]);
  const [loadingPreguntas, setLoadingPreguntas] = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [vista, setVista] = useState(VISTA.LISTA);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Formulario ─────────────────────────────────────────────────────────────
  const [editando, setEditando] = useState(null);
  const [tipoPregunta, setTipoPregunta] = useState(null);
  const [enunciado, setEnunciado] = useState("");
  const [imagenArchivo, setImagenArchivo] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null);

  // Opciones múltiple y selección múltiple
  const [opciones, setOpciones] = useState([nuevaOpcion(), nuevaOpcion()]);

  // Verdadero/Falso
  const [vfCorrecta, setVfCorrecta] = useState("Verdadero");

  // Ordenar
  const [elementosOrdenar, setElementosOrdenar] = useState([
    nuevoElementoOrdenar(),
    nuevoElementoOrdenar(),
  ]);

  // Completar
  const [textoCompletar, setTextoCompletar] = useState("");
  const [espaciosCompletar, setEspaciosCompletar] = useState([
    nuevoEspacioCompletar(),
  ]);
  const [modoCompletar, setModoCompletar] = useState("ESCRIBIR");

  // UI
  const [errForm, setErrForm] = useState("");
  const [guardando, setGuardando] = useState(false);

  // ── Configuración de cuestionario ──────────────────────────────────────────
  const [configuraciones, setConfiguraciones] = useState([]); // configs existentes de la materia
  const [cfgModo, setCfgModo] = useState("TEST");
  const [cfgTiempo, setCfgTiempo] = useState(""); // "" = sin límite
  const [cfgIntentos, setCfgIntentos] = useState(1);
  const [cfgErrForm, setCfgErrForm] = useState("");
  const [cfgGuardando, setCfgGuardando] = useState(false);
  const [eliminandoCfg, setEliminandoCfg] = useState(null);

  // ── Cargar materias al montar ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.getMaterias();
        setMaterias(res.data || []);
      } catch (e) {
        setError("Error al cargar materias.");
      } finally {
        setLoadingMaterias(false);
      }
    })();
  }, []);

  // ── Cargar preguntas al cambiar materia ────────────────────────────────────
  useEffect(() => {
    if (!materiaSeleccionada) return;
    cargarPreguntas(materiaSeleccionada.id_materia);
    cargarConfiguraciones(materiaSeleccionada.id_materia);
  }, [materiaSeleccionada]);

  // 🔥 SINCRONIZAR ESTADO DE COMPLETAR
  useEffect(() => {
    if (tipoPregunta !== TIPO_P.COMPLETAR) return;
    const slots = (textoCompletar || "").match(/\[\[([^\]]+)\]\]/g) || [];
    const nombresEspacios = slots.map((s) => s.replace(/\[\[|\]\]/g, ""));

    setEspaciosCompletar((prev) =>
      nombresEspacios.map((nombre) => {
        const existente = prev.find((e) => e.label === nombre);
        return (
          existente || {
            label: nombre,
            respuestas: [""],
            _id: Math.random(),
          }
        );
      })
    );
  }, [textoCompletar, tipoPregunta]);

  const cargarPreguntas = async (id) => {
    setLoadingPreguntas(true);
    setError("");
    try {
      const res = await api.getPreguntasPorMateria(id);
      setPreguntas(res.data || []);
    } catch (e) {
      setError(e.message || "Error al cargar preguntas.");
    } finally {
      setLoadingPreguntas(false);
    }
  };

  const cargarConfiguraciones = async (id) => {
    try {
      const res = await api.getConfiguracionesPorMateria(id);
      setConfiguraciones(res.data?.configuraciones || []);
    } catch { }
  };

  // ── Abrir configurar cuestionario ──────────────────────────────────────────
  const abrirConfig = (modoPreseleccionado = "TEST") => {
    const existente = configuraciones.find(
      (c) => c.modo === modoPreseleccionado,
    );
    setCfgModo(modoPreseleccionado);
    setCfgTiempo(
      existente?.tiempo_limite_min ? String(existente.tiempo_limite_min) : "",
    );
    setCfgIntentos(existente?.intentos_permitidos ?? 1);
    setCfgErrForm("");
    irA(VISTA.CONFIG);
  };

  // ── Guardar configuración ──────────────────────────────────────────────────
  const handleGuardarConfig = async () => {
    if (
      cfgTiempo !== "" &&
      (isNaN(parseInt(cfgTiempo)) || parseInt(cfgTiempo) < 1)
    ) {
      return setCfgErrForm(
        "El tiempo debe ser un número mayor a 0, o déjalo vacío para sin límite.",
      );
    }
    if (isNaN(cfgIntentos) || cfgIntentos < 1) {
      return setCfgErrForm("Los intentos deben ser un número mayor a 0.");
    }
    setCfgGuardando(true);
    setCfgErrForm("");
    try {
      await api.upsertConfiguracion(materiaSeleccionada.id_materia, {
        modo: cfgModo,
        tiempo_limite_min: cfgTiempo !== "" ? parseInt(cfgTiempo) : null,
        intentos_permitidos: parseInt(cfgIntentos),
      });
      await cargarConfiguraciones(materiaSeleccionada.id_materia);
      toast(`Configuración ${cfgModo} guardada.`);
      irA(VISTA.LISTA);
    } catch (e) {
      setCfgErrForm(e.message || "Error al guardar.");
    } finally {
      setCfgGuardando(false);
    }
  };

  // ── Eliminar configuración ─────────────────────────────────────────────────
  const handleEliminarConfig = async (cfg) => {
    if (!window.confirm(`¿Eliminar configuración ${cfg.modo}?`)) return;
    setEliminandoCfg(cfg.id_config);
    try {
      await api.eliminarConfiguracion(cfg.id_config);
      await cargarConfiguraciones(materiaSeleccionada.id_materia);
      toast("Configuración eliminada.");
    } catch (e) {
      setError(e.message?.replace("RESTRICCION: ", "") || "Error al eliminar.");
    } finally {
      setEliminandoCfg(null);
    }
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const toast = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // ── Seleccionar materia ────────────────────────────────────────────────────
  const seleccionarMateria = (m) => {
    setMateriaSeleccionada(m);
    setDropdownAbierto(false);
    setVista(VISTA.LISTA);
    resetForm();
  };

  // ── Navegación ─────────────────────────────────────────────────────────────
  const irA = (v) => {
    setErrForm("");
    setVista(v);
  };

  const resetForm = () => {
    setEditando(null);
    setEnunciado("");
    setImagenArchivo(null);
    setPreviewImagen(null);
    setOpciones([nuevaOpcion(), nuevaOpcion()]);
    setVfCorrecta("Verdadero");
    setElementosOrdenar([nuevoElementoOrdenar(), nuevoElementoOrdenar()]);
    setTextoCompletar("");
    setEspaciosCompletar([nuevoEspacioCompletar()]);
    setModoCompletar("ESCRIBIR");
    setTipoPregunta(null);
    setErrForm("");
  };

  const volverALista = () => {
    resetForm();
    irA(VISTA.LISTA);
  };

  // ── Abrir editar ───────────────────────────────────────────────────────────
  const abrirEditar = (p) => {
    setEditando(p);
    setEnunciado(p.enunciado);
    setImagenArchivo(null);
    setPreviewImagen(p.url_imagen || null);
    setTipoPregunta(p.tipo_pregunta);

    if (p.tipo_pregunta === TIPO_P.VF) {
      setVfCorrecta(
        p.opciones?.find((o) => o.es_correcta)?.texto || "Verdadero",
      );
    } else if ([TIPO_P.MULTIPLE, TIPO_P.SELECCION_MULTIPLE].includes(p.tipo_pregunta)) {
      setOpciones(
        (p.opciones || []).map((o) => ({
          texto: o.texto,
          es_correcta: o.es_correcta,
          _id: Math.random(),
        })),
      );
    } else if (p.tipo_pregunta === TIPO_P.ORDENAR) {
      const estructura = p.estructura_json || {};
      setElementosOrdenar(
        (estructura.opciones || []).map((o, idx) => ({
          texto: o.texto || o,
          orden: idx,
          _id: Math.random(),
        })) || [nuevoElementoOrdenar()],
      );
    } else if (p.tipo_pregunta === TIPO_P.COMPLETAR) {
      const estructura = p.estructura_json || {};
      setTextoCompletar(estructura.texto || "");
      setModoCompletar(estructura.modo_interaccion || "ESCRIBIR");
      setEspaciosCompletar(
        (estructura.espacios || []).map((e) => ({
          label: e.label || "",
          respuestas: Array.isArray(e.respuestas) ? e.respuestas : [],
          _id: Math.random(),
        })) || [nuevoEspacioCompletar()],
      );
    }

    irA(VISTA.FORM);
  };

  // ── Opciones múltiple ──────────────────────────────────────────────────────
  const agregarOpcion = () => setOpciones((p) => [...p, nuevaOpcion()]);
  const eliminarOpcion = (id) =>
    setOpciones((p) => p.filter((o) => o._id !== id));
  const cambiarTexto = (id, t) =>
    setOpciones((p) => p.map((o) => (o._id === id ? { ...o, texto: t } : o)));
  const marcarCorrecta = (id) =>
    setOpciones((p) => p.map((o) => ({ ...o, es_correcta: o._id === id })));

  // ── Validar ────────────────────────────────────────────────────────────────
  const validar = () => {
    if (!enunciado.trim()) return "El enunciado es obligatorio.";

    if (tipoPregunta === TIPO_P.MULTIPLE) {
      if (opciones.length < 2) return "Mínimo 2 opciones.";
      if (opciones.some((o) => !o.texto.trim()))
        return "Todas las opciones deben tener texto.";
      const n = opciones.filter((o) => o.es_correcta).length;
      if (n === 0) return "Marca exactamente 1 opción correcta.";
      if (n > 1) return "Solo puede haber 1 opción correcta.";
    } else if (tipoPregunta === TIPO_P.SELECCION_MULTIPLE) {
      if (opciones.length < 2) return "Mínimo 2 opciones.";
      if (opciones.some((o) => !o.texto.trim()))
        return "Todas las opciones deben tener texto.";
      const n = opciones.filter((o) => o.es_correcta).length;
      if (n === 0) return "Selecciona al menos 1 opción correcta.";
    } else if (tipoPregunta === TIPO_P.ORDENAR) {
      if (elementosOrdenar.length < 2) return "Mínimo 2 elementos para ordenar.";
      if (elementosOrdenar.some((e) => !e.texto.trim()))
        return "Todos los elementos deben tener texto.";
    } else if (tipoPregunta === TIPO_P.COMPLETAR) {
      if (!textoCompletar.trim()) return "El texto con espacios es obligatorio.";
      const slots = (textoCompletar || "").match(/\[\[([^\]]+)\]\]/g) || [];
      if (slots.length === 0)
        return "Usa [[nombre_espacio]] para indicar los espacios a completar.";
      if (espaciosCompletar.some((e) => !e.label.trim() || e.respuestas.length === 0))
        return "Todos los espacios deben tener etiqueta y al menos 1 respuesta válida.";
      if (slots.length !== espaciosCompletar.length)
        return `Hay ${slots.length} espacios en el texto pero ${espaciosCompletar.length} espacios configurados.`;
    }

    return null;
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    const err = validar();
    if (err) return setErrForm(err);
    setGuardando(true);
    setErrForm("");

    let estructura_json = null;
    let opciones_finales = [];

    if (tipoPregunta === TIPO_P.VF) {
      opciones_finales = opcionesVF(vfCorrecta);
      estructura_json = {
        tipo: tipoPregunta,
        opciones: opciones_finales.map((o) => ({
          opcion_id: o.texto === "Verdadero" ? "V" : "F",
          texto: o.texto,
        })),
        respuesta: {
          opcion_id: vfCorrecta === "Verdadero" ? "V" : "F",
        },
      };
    } else if (tipoPregunta === TIPO_P.MULTIPLE) {
      opciones_finales = opciones.map(({ texto, es_correcta }) => ({
        texto,
        es_correcta,
      }));
      const correcta = opciones.find((o) => o.es_correcta);
      estructura_json = {
        tipo: tipoPregunta,
        opciones: opciones_finales.map((o, idx) => ({
          opcion_id: String.fromCharCode(65 + idx),
          texto: o.texto,
        })),
        respuesta: {
          opcion_id: String.fromCharCode(65 + opciones.indexOf(correcta)),
        },
      };
    } else if (tipoPregunta === TIPO_P.SELECCION_MULTIPLE) {
      opciones_finales = opciones.map(({ texto, es_correcta }) => ({
        texto,
        es_correcta,
      }));
      const correctas = opciones.filter((o) => o.es_correcta);
      estructura_json = {
        tipo: tipoPregunta,
        opciones: opciones_finales.map((o, idx) => ({
          opcion_id: String.fromCharCode(65 + idx),
          texto: o.texto,
        })),
        respuesta: {
          opciones_ids: correctas.map((c) =>
            String.fromCharCode(65 + opciones.indexOf(c)),
          ),
        },
      };
    } else if (tipoPregunta === TIPO_P.ORDENAR) {
      const elementosOrdenados = [...elementosOrdenar];
      estructura_json = {
        tipo: tipoPregunta,
        opciones: elementosOrdenados.map((e) => e.texto),
        respuesta: {
          orden_ids: elementosOrdenados.map((e, idx) =>
            String.fromCharCode(65 + idx),
          ),
        },
      };
    } else if (tipoPregunta === TIPO_P.COMPLETAR) {
      const slots = (textoCompletar || "").match(/\[\[([^\]]+)\]\]/g) || [];
      const espaciosLimpios = espaciosCompletar.map((e) => ({
        ...e,
        respuestas: e.respuestas
          .map((r) => r.trim().toLowerCase())
          .filter((r) => r !== ""),
      }));

      const esValido =
        slots.length > 0 &&
        espaciosLimpios.length === slots.length &&
        espaciosLimpios.every(
          (e) => e.label && e.respuestas.length > 0
        );

      if (!esValido) {
        setErrForm(
          "Todos los espacios deben tener al menos una respuesta válida."
        );
        setGuardando(false);
        return;
      }

      estructura_json = {
        tipo: tipoPregunta,
        texto: textoCompletar,
        modo_interaccion: modoCompletar,
        espacios: espaciosLimpios.map((e, idx) => ({
          espacio_id: String(idx),
          label: e.label,
          respuestas: e.respuestas,
        })),
        respuesta: {
          aceptadas: espaciosLimpios.map((e, idx) => ({
            espacio_id: String(idx),
            valores: e.respuestas,
          })),
        },
      };
    }

    const datos = {
      id_materia: materiaSeleccionada.id_materia,
      enunciado: enunciado.trim(),
      tipo_pregunta: tipoPregunta,
      ...(opciones_finales.length > 0 && { opciones: opciones_finales }),
      ...(estructura_json && { estructura_json }),
      ...(imagenArchivo && { imagen: imagenArchivo }),
    };

    try {
      if (editando) {
        await api.actualizarPregunta(editando.id_pregunta, datos);
        toast("Pregunta actualizada.");
      } else {
        await api.crearPregunta(datos);
        toast("Pregunta creada.");
      }
      await cargarPreguntas(materiaSeleccionada.id_materia);
      volverALista();
    } catch (e) {
      const msg = e.message || "Error al guardar.";
      setErrForm(
        msg.includes("RESTRICCION") || msg.includes("historial")
          ? "Esta pregunta tiene respuestas registradas. Solo puedes editar el enunciado."
          : msg,
      );
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────────────────────
  const handleEliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.enunciado.substring(0, 60)}..."?`))
      return;
    try {
      await api.eliminarPregunta(p.id_pregunta);
      toast("Pregunta eliminada.");
      await cargarPreguntas(materiaSeleccionada.id_materia);
    } catch (e) {
      const msg = e.message || "";
      setError(
        msg.includes("RESTRICCION")
          ? "No se puede eliminar: tiene respuestas registradas."
          : msg || "Error al eliminar.",
      );
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="gp-root">
      {/* Toast */}
      {success && (
        <div className="gp-toast">
          <CheckCheck size={16} />
          {success}
        </div>
      )}

      {/* ── CABECERA FIJA ─────────────────────────────────────────────── */}
      <div className="gp-topbar">
        <div className="gp-topbar-left">
          {/* Botón volver si no estamos en lista */}
          {vista !== VISTA.LISTA && (
            <button className="gp-back-btn" onClick={volverALista}>
              <ArrowLeft size={16} /> Volver
            </button>
          )}
          <div>
            <h2 className="gp-title">Gestión de Preguntas</h2>
            <p className="gp-subtitle">
              {materiaSeleccionada ? (
                <>
                  Banco de preguntas de{" "}
                  <strong>{materiaSeleccionada.nombre}</strong>
                </>
              ) : (
                "Selecciona una materia para comenzar"
              )}
            </p>
          </div>
        </div>

        {/* Selector de materia */}
        <div className="gp-materia-selector">
          <button
            className="gp-materia-btn"
            onClick={() => setDropdownAbierto((v) => !v)}
            disabled={loadingMaterias}
          >
            <BookOpen size={15} />
            <span>
              {materiaSeleccionada
                ? materiaSeleccionada.nombre
                : "Seleccionar materia"}
            </span>
            <ChevronDown
              size={15}
              className={dropdownAbierto ? "gp-chevron-open" : ""}
            />
          </button>

          {dropdownAbierto && (
            <div className="gp-dropdown">
              {loadingMaterias ? (
                <div className="gp-dropdown-loading">
                  <div className="gp-spinner-sm" /> Cargando...
                </div>
              ) : materias.length === 0 ? (
                <div className="gp-dropdown-empty">
                  No hay materias registradas
                </div>
              ) : (
                materias.map((m) => (
                  <button
                    key={m.id_materia}
                    className={`gp-dropdown-item${materiaSeleccionada?.id_materia === m.id_materia ? " gp-dropdown-item--active" : ""}`}
                    onClick={() => seleccionarMateria(m)}
                  >
                    {m.nombre}
                    {materiaSeleccionada?.id_materia === m.id_materia && (
                      <CheckCircle2 size={14} />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="gp-error-banner">
          <AlertCircle size={15} /> {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Sin materia seleccionada ──────────────────────────────────── */}
      {!materiaSeleccionada && (
        <div className="gp-no-materia">
          <div className="gp-no-materia-icon">
            <BookOpen size={28} />
          </div>
          <h3>Selecciona una materia</h3>
          <p>
            Elige una materia del selector para ver y gestionar su banco de
            preguntas.
          </p>
        </div>
      )}

      {/* ── Con materia seleccionada ──────────────────────────────────── */}
      {materiaSeleccionada && (
        <>
          {/* ═══════ VISTA: LISTA ═══════════════════════════════════════ */}
          {vista === VISTA.LISTA && (
            <>
              {/* Cards acción */}
              <div className="gp-actions-row">
                {/* Card editar cuestionario */}
                <div className="gp-action-card" onClick={() => irA(VISTA.MODO)}>
                  <div className="gp-action-icon gp-icon-blue">
                    <FileQuestion size={26} />
                  </div>
                  <div>
                    <h3 className="gp-action-title">Editar Cuestionario</h3>
                    <p className="gp-action-desc">
                      Agrega, edita o elimina preguntas del banco de
                      evaluaciones.
                    </p>
                    <span className="gp-action-link">
                      Ir al banco de preguntas →
                    </span>
                  </div>
                </div>

                {/* Card configurar cuestionario — ahora funcional */}
                <div
                  className="gp-action-card gp-action-card--config"
                  onClick={() => abrirConfig("TEST")}
                >
                  <div className="gp-action-icon gp-icon-amber">
                    <Settings size={22} />
                  </div>
                  <div>
                    <h3 className="gp-action-title">Configurar Cuestionario</h3>
                    <p className="gp-action-desc">
                      Asigna modo TEST o EXAMEN, tiempo límite e intentos
                      permitidos.
                    </p>
                    {/* Badges de configuraciones existentes */}
                    <div className="gp-cfg-badges">
                      {["TEST", "EXAMEN"].map((m) => {
                        const cfg = configuraciones.find((c) => c.modo === m);
                        return cfg ? (
                          <span
                            key={m}
                            className={`gp-cfg-badge gp-cfg-badge--${m.toLowerCase()}`}
                          >
                            {m} ·{" "}
                            {cfg.tiempo_limite_min
                              ? `${cfg.tiempo_limite_min}min`
                              : "∞"}{" "}
                            · {cfg.intentos_permitidos}x
                          </span>
                        ) : (
                          <span
                            key={m}
                            className="gp-cfg-badge gp-cfg-badge--empty"
                          >
                            {m} no configurado
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lista preguntas */}
              <div className="gp-section-header">
                <h3 className="gp-section-title">Preguntas Registradas</h3>
                <span className="gp-badge-count">{preguntas.length}</span>
              </div>

              {loadingPreguntas ? (
                <div className="gp-state">
                  <div className="gp-spinner" />
                  <span>Cargando preguntas...</span>
                </div>
              ) : preguntas.length === 0 ? (
                <div className="gp-empty">
                  <div className="gp-empty-icon">
                    <BookOpen size={24} />
                  </div>
                  <p>No hay preguntas registradas para esta materia.</p>
                  <button
                    className="gp-btn-primary"
                    onClick={() => irA(VISTA.MODO)}
                  >
                    Agregar primera pregunta
                  </button>
                </div>
              ) : (
                <div className="gp-list">
                  {preguntas.map((p, i) => (
                    <div key={p.id_pregunta} className="gp-item">
                      <div className="gp-item-num">{i + 1}</div>
                      <div className="gp-item-body">
                        <p className="gp-item-enunciado">{p.enunciado}</p>
                        <div className="gp-item-meta">
                          <span
                            className={`gp-tipo-badge gp-tipo-${p.tipo_pregunta === TIPO_P.MULTIPLE
                              ? "mult"
                              : p.tipo_pregunta === TIPO_P.VF
                                ? "vf"
                                : p.tipo_pregunta === TIPO_P.SELECCION_MULTIPLE
                                  ? "smult"
                                  : p.tipo_pregunta === TIPO_P.ORDENAR
                                    ? "ordenar"
                                    : p.tipo_pregunta === TIPO_P.RELACIONAR
                                      ? "relacionar"
                                      : "completar"
                              }`}
                          >
                            {p.tipo_pregunta === TIPO_P.MULTIPLE && (
                              <>
                                <List size={11} /> Múltiple
                              </>
                            )}
                            {p.tipo_pregunta === TIPO_P.VF && (
                              <>
                                <ToggleLeft size={11} /> V/F
                              </>
                            )}
                            {p.tipo_pregunta === TIPO_P.SELECCION_MULTIPLE && (
                              <>
                                <CheckCheck size={11} /> Sel. Múltiple
                              </>
                            )}
                            {p.tipo_pregunta === TIPO_P.ORDENAR && (
                              <>
                                <List size={11} /> Ordenar
                              </>
                            )}
                            {p.tipo_pregunta === TIPO_P.COMPLETAR && (
                              <>
                                <PenLine size={11} /> Completar
                              </>
                            )}
                          </span>
                          <span className="gp-opts-count">
                            {p.opciones?.length || 0} opciones
                          </span>
                        </div>
                      </div>
                      <div className="gp-item-actions">
                        <button
                          className="gp-btn-edit"
                          onClick={() => abrirEditar(p)}
                        >
                          <PenLine size={13} /> Editar
                        </button>
                        <button
                          className="gp-btn-delete"
                          onClick={() => handleEliminar(p)}
                        >
                          <Trash2 size={13} /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══════ VISTA: MODO (Manual / Excel) ═══════════════════════ */}
          {vista === VISTA.MODO && (
            <div className="gp-page">
              <div className="gp-page-header">
                <h3>Agregar Preguntas</h3>
                <p>Selecciona cómo deseas agregar las preguntas al banco</p>
              </div>
              <div className="gp-modo-grid">
                {/* Manual */}
                <div className="gp-modo-card" onClick={() => irA(VISTA.TIPO)}>
                  <div className="gp-modo-icon gp-modo-blue">
                    <PenLine size={28} />
                  </div>
                  <h4>Agregar Manualmente</h4>
                  <p>
                    Crea preguntas una por una usando nuestro formulario
                    interactivo. Ideal para preguntas específicas.
                  </p>
                  <ul className="gp-modo-list">
                    <li>Opción múltiple y V/F</li>
                    <li>Control total del contenido</li>
                    <li>Editor intuitivo</li>
                  </ul>
                </div>
                {/* Excel */}
                <div
                  className="gp-modo-card"
                  onClick={() => irA(VISTA.EXCEL)}
                >
                  <div className="gp-modo-icon gp-modo-green">
                    <TableProperties size={28} />
                  </div>
                  <h4>Carga de Archivo Excel</h4>
                  <p>
                    Importa múltiples preguntas desde un archivo Excel. Perfecto
                    para cargas masivas.
                  </p>
                  <ul className="gp-modo-list gp-modo-list--green">
                    <li>Formato .xlsx o .xls</li>
                    <li>Carga múltiples preguntas</li>
                    <li>Ahorra tiempo</li>
                  </ul>
                </div>
              </div>
              <div className="gp-page-footer">
                <button className="gp-btn-secondary" onClick={volverALista}>
                  <ChevronLeft size={15} /> Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ═══════ VISTA: EXCEL (Carga masiva) ════════════════════════ */}
          {vista === VISTA.EXCEL && (
            <CargaExcel
              idMateria={materiaSeleccionada.id_materia}
              nombreMateria={materiaSeleccionada.nombre}
              onVolver={() => irA(VISTA.MODO)}
              onExito={() => {
                cargarPreguntas(materiaSeleccionada.id_materia);
                toast("Preguntas cargadas desde Excel.");
              }}
            />
          )}

          {/* ═══════ VISTA: CONFIG (Configurar Cuestionario) ════════════ */}
          {vista === VISTA.CONFIG && (
            <div className="gp-page gp-page--form">
              <div className="gp-page-header">
                <h3>Configurar Cuestionario</h3>
                <p>{materiaSeleccionada.nombre}</p>
              </div>

              <div className="gp-form-card">
                {/* Selector de modo */}
                <div className="gp-form-group">
                  <label className="gp-label">Tipo de Cuestionario</label>
                  <div className="gp-cfg-modo-row">
                    {["TEST", "EXAMEN"].map((m) => (
                      <div
                        key={m}
                        className={`gp-cfg-modo-card${cfgModo === m ? " gp-cfg-modo-card--active" : ""}`}
                        onClick={() => {
                          // Al cambiar modo, cargar valores existentes si los hay
                          const ex = configuraciones.find((c) => c.modo === m);
                          setCfgModo(m);
                          setCfgTiempo(
                            ex?.tiempo_limite_min
                              ? String(ex.tiempo_limite_min)
                              : "",
                          );
                          setCfgIntentos(ex?.intentos_permitidos ?? 1);
                          setCfgErrForm("");
                        }}
                      >
                        {cfgModo === m ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <Circle size={18} />
                        )}
                        <div>
                          <div className="gp-cfg-modo-name">{m}</div>
                          <div className="gp-cfg-modo-desc">
                            {m === "TEST"
                              ? "Práctica libre, feedback inmediato"
                              : "Examen formal cronometrado"}
                          </div>
                        </div>
                        {configuraciones.find((c) => c.modo === m) && (
                          <span className="gp-cfg-exists">Configurado</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tiempo límite */}
                <div className="gp-form-group">
                  <label className="gp-label">
                    Tiempo límite{" "}
                    <span className="gp-label-opt">
                      (minutos — vacío = sin límite)
                    </span>
                  </label>
                  <input
                    className="gp-input"
                    type="number"
                    min="1"
                    placeholder="Ej: 60"
                    value={cfgTiempo}
                    onChange={(e) => setCfgTiempo(e.target.value)}
                  />
                </div>

                {/* Intentos permitidos */}
                <div className="gp-form-group">
                  <label className="gp-label">Intentos permitidos</label>
                  <input
                    className="gp-input"
                    type="number"
                    min="1"
                    value={cfgIntentos}
                    onChange={(e) =>
                      setCfgIntentos(parseInt(e.target.value) || 1)
                    }
                  />
                </div>

                {/* Configuraciones existentes */}
                {configuraciones.length > 0 && (
                  <div className="gp-form-group">
                    <label className="gp-label">Configuraciones actuales</label>
                    <div className="gp-cfg-list">
                      {configuraciones.map((cfg) => (
                        <div key={cfg.id_config} className="gp-cfg-row">
                          <span
                            className={`gp-cfg-tag gp-cfg-tag--${cfg.modo.toLowerCase()}`}
                          >
                            {cfg.modo}
                          </span>
                          <span className="gp-cfg-info">
                            {cfg.tiempo_limite_min
                              ? `${cfg.tiempo_limite_min} min`
                              : "Sin límite"}{" "}
                            · {cfg.intentos_permitidos} intento
                            {cfg.intentos_permitidos !== 1 ? "s" : ""}
                          </span>
                          <button
                            className="gp-btn-delete"
                            onClick={() => handleEliminarConfig(cfg)}
                            disabled={eliminandoCfg === cfg.id_config}
                          >
                            <Trash2 size={13} />
                            {eliminandoCfg === cfg.id_config
                              ? "..."
                              : "Eliminar"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cfgErrForm && (
                  <div className="gp-form-error">
                    <AlertCircle size={15} /> {cfgErrForm}
                  </div>
                )}
              </div>

              <div className="gp-page-footer">
                <button className="gp-btn-secondary" onClick={volverALista}>
                  Cancelar
                </button>
                <button
                  className="gp-btn-primary"
                  onClick={handleGuardarConfig}
                  disabled={cfgGuardando}
                >
                  {cfgGuardando
                    ? "Guardando..."
                    : `Guardar configuración ${cfgModo}`}
                </button>
              </div>
            </div>
          )}

          {/* ═══════ VISTA: TIPO (Seleccionar tipo) ════════════════════════ */}
          {vista === VISTA.TIPO && (
            <div className="gp-page">
              <div className="gp-page-header">
                <h3>Crear Nueva Pregunta</h3>
                <p>Selecciona el tipo de pregunta:</p>
              </div>
              <div className="gp-tipo-grid">
                {/* Opción Múltiple */}
                <div
                  className="gp-tipo-card"
                  onClick={() => {
                    setTipoPregunta(TIPO_P.MULTIPLE);
                    setOpciones([nuevaOpcion(), nuevaOpcion()]);
                    irA(VISTA.FORM);
                  }}
                >
                  <div className="gp-tipo-icon">
                    <List size={26} />
                  </div>
                  <h4>Opción Múltiple</h4>
                  <p>Una opción correcta</p>
                </div>

                {/* Verdadero / Falso */}
                <div
                  className="gp-tipo-card"
                  onClick={() => {
                    setTipoPregunta(TIPO_P.VF);
                    setVfCorrecta("Verdadero");
                    irA(VISTA.FORM);
                  }}
                >
                  <div className="gp-tipo-icon">
                    <ToggleLeft size={26} />
                  </div>
                  <h4>Verdadero / Falso</h4>
                  <p>Dos opciones de respuesta</p>
                </div>

                {/* Selección Múltiple */}
                <div
                  className="gp-tipo-card"
                  onClick={() => {
                    setTipoPregunta(TIPO_P.SELECCION_MULTIPLE);
                    setOpciones([nuevaOpcion(), nuevaOpcion()]);
                    irA(VISTA.FORM);
                  }}
                >
                  <div className="gp-tipo-icon">
                    <CheckCheck size={26} />
                  </div>
                  <h4>Selección Múltiple</h4>
                  <p>Varias opciones correctas</p>
                </div>

                {/* Ordenar */}
                <div
                  className="gp-tipo-card"
                  onClick={() => {
                    setTipoPregunta(TIPO_P.ORDENAR);
                    setElementosOrdenar([
                      nuevoElementoOrdenar(),
                      nuevoElementoOrdenar(),
                    ]);
                    irA(VISTA.FORM);
                  }}
                >
                  <div className="gp-tipo-icon">
                    <List size={26} />
                  </div>
                  <h4>Ordenar Elementos</h4>
                  <p>Ordenar una lista de elementos</p>
                </div>

                {/* Completar */}
                <div
                  className="gp-tipo-card"
                  onClick={() => {
                    setTipoPregunta(TIPO_P.COMPLETAR);
                    setTextoCompletar("");
                    setEspaciosCompletar([nuevoEspacioCompletar()]);
                    irA(VISTA.FORM);
                  }}
                >
                  <div className="gp-tipo-icon">
                    <PenLine size={26} />
                  </div>
                  <h4>Completar Espacios</h4>
                  <p>Llenar espacios en blanco</p>
                </div>
              </div>
              <div className="gp-page-footer">
                <button
                  className="gp-btn-secondary"
                  onClick={() => irA(VISTA.MODO)}
                >
                  <ChevronLeft size={15} /> Volver
                </button>
              </div>
            </div>
          )}

          {/* ═══════ VISTA: FORM ═════════════════════════════════════════ */}
          {vista === VISTA.FORM && (
            <div className="gp-page gp-page--form">
              <div className="gp-page-header">
                <h3>{editando ? "Editar Pregunta" : "Crear Nueva Pregunta"}</h3>
                <p>{materiaSeleccionada.nombre}</p>
              </div>

              <div className="gp-form-card">
                {/* Cambiar tipo — solo en creación */}
                {!editando && (
                  <button
                    className="gp-back-link"
                    onClick={() => irA(VISTA.TIPO)}
                  >
                    <ChevronLeft size={15} /> Cambiar tipo de pregunta
                  </button>
                )}

                <div className="gp-form-tipo-badge">
                  {tipoPregunta === TIPO_P.MULTIPLE && (
                    <>
                      <List size={13} /> Opción Múltiple
                    </>
                  )}
                  {tipoPregunta === TIPO_P.VF && (
                    <>
                      <ToggleLeft size={13} /> Verdadero / Falso
                    </>
                  )}
                  {tipoPregunta === TIPO_P.SELECCION_MULTIPLE && (
                    <>
                      <CheckCheck size={13} /> Selección Múltiple
                    </>
                  )}
                  {tipoPregunta === TIPO_P.ORDENAR && (
                    <>
                      <List size={13} /> Ordenar Elementos
                    </>
                  )}
                  {tipoPregunta === TIPO_P.COMPLETAR && (
                    <>
                      <PenLine size={13} /> Completar Espacios
                    </>
                  )}
                </div>

                {/* Enunciado */}
                <div className="gp-form-group">
                  <label className="gp-label">Enunciado</label>
                  <textarea
                    className={`gp-textarea${errForm && !enunciado.trim() ? " gp-input--err" : ""}`}
                    placeholder="Escribe el enunciado de la pregunta..."
                    value={enunciado}
                    onChange={(e) => setEnunciado(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Imagen */}
                <div className="gp-form-group">
                  <label className="gp-label">
                    Imagen de la pregunta{" "}
                    <span className="gp-label-opt">(opcional)</span>
                  </label>
                  <div className="gp-file-input-wrapper">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImagenArchivo(file);
                          const reader = new FileReader();
                          reader.onload = (ev) => setPreviewImagen(ev.target.result);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="gp-file-input"
                      id="imagen-input"
                    />
                    <label htmlFor="imagen-input" className="gp-file-label">
                      {imagenArchivo ? `📎 ${imagenArchivo.name}` : "Seleccionar imagen"}
                    </label>
                  </div>
                  <p className="gp-hint">Formatos: JPEG, PNG, WebP. Máximo 2MB.</p>
                  {previewImagen && (
                    <div className="gp-preview-imagen">
                      <img src={previewImagen} alt="Preview" className="gp-preview-img" />
                    </div>
                  )}
                </div>

                {/* Opciones MULTIPLE */}
                {tipoPregunta === TIPO_P.MULTIPLE && (
                  <div className="gp-form-group">
                    <label className="gp-label">Opciones de Respuesta</label>
                    <p className="gp-hint">
                      Haz clic en el círculo para marcar la respuesta correcta (una sola)
                    </p>
                    <div className="gp-opciones">
                      {opciones.map((op, idx) => (
                        <div
                          key={op._id}
                          className={`gp-opcion-row${op.es_correcta ? " gp-opcion-row--correct" : ""}`}
                        >
                          <button
                            className={`gp-opcion-radio${op.es_correcta ? " gp-opcion-radio--active" : ""}`}
                            onClick={() => marcarCorrecta(op._id)}
                          >
                            {op.es_correcta ? (
                              <CheckCircle2 size={20} />
                            ) : (
                              <Circle size={20} />
                            )}
                          </button>
                          <input
                            className="gp-opcion-input"
                            type="text"
                            placeholder={`Opción ${idx + 1}`}
                            value={op.texto}
                            onChange={(e) =>
                              cambiarTexto(op._id, e.target.value)
                            }
                          />
                          {opciones.length > 2 && (
                            <button
                              className="gp-opcion-del"
                              onClick={() => eliminarOpcion(op._id)}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                      {opciones.length < 6 && (
                        <button
                          className="gp-add-opcion"
                          onClick={agregarOpcion}
                        >
                          <Plus size={15} /> Agregar opción
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Opciones V/F */}
                {tipoPregunta === TIPO_P.VF && (
                  <div className="gp-form-group">
                    <label className="gp-label">Respuesta Correcta</label>
                    <p className="gp-hint">
                      Selecciona cuál es la respuesta correcta
                    </p>
                    <div className="gp-vf-row">
                      {["Verdadero", "Falso"].map((val) => (
                        <div
                          key={val}
                          className={`gp-vf-card${vfCorrecta === val ? " gp-vf-card--active" : ""}`}
                          onClick={() => setVfCorrecta(val)}
                        >
                          {vfCorrecta === val ? (
                            <CheckCircle2 size={20} />
                          ) : (
                            <Circle size={20} />
                          )}
                          <span>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones SELECCION MULTIPLE */}
                {tipoPregunta === TIPO_P.SELECCION_MULTIPLE && (
                  <div className="gp-form-group">
                    <label className="gp-label">Opciones de Respuesta</label>
                    <p className="gp-hint">
                      Haz clic en los checkboxes para marcar todas las opciones correctas
                    </p>
                    <div className="gp-opciones">
                      {opciones.map((op, idx) => (
                        <div
                          key={op._id}
                          className={`gp-opcion-row${op.es_correcta ? " gp-opcion-row--correct" : ""}`}
                        >
                          <button
                            className={`gp-opcion-radio${op.es_correcta ? " gp-opcion-radio--active" : ""}`}
                            onClick={() => {
                              setOpciones((prev) =>
                                prev.map((o) =>
                                  o._id === op._id
                                    ? { ...o, es_correcta: !o.es_correcta }
                                    : o,
                                ),
                              );
                            }}
                          >
                            {op.es_correcta ? (
                              <CheckCheck size={20} />
                            ) : (
                              <Circle size={20} />
                            )}
                          </button>
                          <input
                            className="gp-opcion-input"
                            type="text"
                            placeholder={`Opción ${idx + 1}`}
                            value={op.texto}
                            onChange={(e) =>
                              cambiarTexto(op._id, e.target.value)
                            }
                          />
                          {opciones.length > 2 && (
                            <button
                              className="gp-opcion-del"
                              onClick={() => eliminarOpcion(op._id)}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                      {opciones.length < 6 && (
                        <button
                          className="gp-add-opcion"
                          onClick={agregarOpcion}
                        >
                          <Plus size={15} /> Agregar opción
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ORDENAR ELEMENTOS */}
                {tipoPregunta === TIPO_P.ORDENAR && (
                  <div className="gp-form-group">
                    <label className="gp-label">Elementos a Ordenar</label>
                    <p className="gp-hint">
                      Ingresa los elementos en el orden CORRECTO (mínimo 2)
                    </p>
                    <div className="gp-opciones">
                      {elementosOrdenar.map((elem, idx) => (
                        <div key={elem._id} className="gp-opcion-row">
                          <div className="gp-elemento-pos">
                            <strong>{idx + 1}º</strong>
                          </div>
                          <input
                            className="gp-opcion-input"
                            type="text"
                            placeholder={`Elemento ${idx + 1}`}
                            value={elem.texto}
                            onChange={(e) => {
                              setElementosOrdenar((prev) =>
                                prev.map((el) =>
                                  el._id === elem._id
                                    ? { ...el, texto: e.target.value }
                                    : el,
                                ),
                              );
                            }}
                          />
                          {elementosOrdenar.length > 2 && (
                            <button
                              className="gp-opcion-del"
                              onClick={() => {
                                setElementosOrdenar((prev) =>
                                  prev.filter((el) => el._id !== elem._id),
                                );
                              }}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                      {elementosOrdenar.length < 8 && (
                        <button
                          className="gp-add-opcion"
                          onClick={() => {
                            setElementosOrdenar((prev) => [
                              ...prev,
                              { texto: "", orden: prev.length, _id: Math.random() },
                            ]);
                          }}
                        >
                          <Plus size={15} /> Agregar elemento
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* COMPLETAR ESPACIOS */}
                {tipoPregunta === TIPO_P.COMPLETAR && (
                  <>
                    <div className="gp-form-group">
                      <label className="gp-label">Modo de Completar</label>
                      <p className="gp-hint">
                        ESCRIBIR: Estudiante escribe las respuestas | ARRASTRAR: Arrastra fichas
                      </p>
                      <div className="gp-vf-row">
                        {["ESCRIBIR"].map((modo) => (
                          <div
                            key={modo}
                            className={`gp-vf-card${modoCompletar === modo ? " gp-vf-card--active" : ""}`}
                            onClick={() => setModoCompletar(modo)}
                          >
                            {modoCompletar === modo ? (
                              <CheckCircle2 size={20} />
                            ) : (
                              <Circle size={20} />
                            )}
                            <span>{modo}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="gp-form-group">
                      <label className="gp-label">Texto con Espacios</label>
                      <p className="gp-hint">
                        Usa [[nombre]] para marcar espacios. Ej: "París es la capital de [[pais]]"
                      </p>
                      <textarea
                        className="gp-textarea"
                        value={textoCompletar}
                        onChange={(e) => setTextoCompletar(e.target.value)}
                        rows={5}
                      />
                    </div>

                    {/* DETECCIÓN + LISTADO DE ESPACIOS */}
                    {(() => {
                      const slots = (textoCompletar || "").match(/\[\[([^\]]+)\]\]/g) || [];
                      const nombresEspacios = slots.map((s) => s.replace(/\[\[|\]\]/g, ""));

                      return (
                        <>
                          {slots.length > 0 && (
                            <div className="gp-form-group">
                              <p className="gp-hint">
                                <strong>
                                  ✓ {slots.length} espacio{slots.length !== 1 ? "s" : ""} detectado{slots.length !== 1 ? "s" : ""}
                                </strong>
                              </p>
                            </div>
                          )}

                          <div className="gp-form-group">
                            <label className="gp-label">Respuestas por Espacio</label>

                            {slots.length === 0 ? (
                              <div className="gp-empty-state">
                                <AlertCircle size={20} />
                                <p>Agrega espacios usando [[nombre]]</p>
                              </div>
                            ) : (
                              <div className="gp-espacios-grid">
                                {nombresEspacios.map((nombreEspacio, idx) => {
                                  const espacio = espaciosCompletar.find(
                                    (e) => e.label === nombreEspacio
                                  );

                                  const respuestas = espacio?.respuestas || [""];

                                  return (
                                    <div key={nombreEspacio} className="gp-espacio-card">
                                      {/* 🔥 UI LIMPIA */}
                                      <div className="gp-espacio-title">
                                        <span className="gp-espacio-label">
                                          Espacio {idx + 1}
                                        </span>
                                        <span className="gp-espacio-id">
                                          {nombreEspacio}
                                        </span>
                                      </div>

                                      <div className="gp-respuestas-stack">
                                        {respuestas.map((resp, respIdx) => (
                                          <div
                                            key={respIdx}
                                            className="gp-respuesta-input-row"
                                          >
                                            <input
                                              className="gp-opcion-input"
                                              type="text"
                                              value={resp}
                                              placeholder="Respuesta válida"
                                              onChange={(e) => {
                                                const valor = e.target.value;

                                                setEspaciosCompletar((prev) =>
                                                  prev.map((e) =>
                                                    e.label === nombreEspacio
                                                      ? {
                                                        ...e,
                                                        respuestas: e.respuestas.map((r, i) =>
                                                          i === respIdx ? valor : r
                                                        ),
                                                      }
                                                      : e
                                                  )
                                                );
                                              }}
                                            />

                                            {respuestas.length > 1 && (
                                              <button
                                                className="gp-respuesta-del"
                                                onClick={() => {
                                                  setEspaciosCompletar((prev) =>
                                                    prev.map((e) =>
                                                      e.label === nombreEspacio
                                                        ? {
                                                          ...e,
                                                          respuestas: e.respuestas.filter(
                                                            (_, i) => i !== respIdx
                                                          ),
                                                        }
                                                        : e
                                                    )
                                                  );
                                                }}
                                              >
                                                <X size={15} />
                                              </button>
                                            )}
                                          </div>
                                        ))}
                                      </div>

                                      <button
                                        className="gp-add-opcion gp-add-opcion--sm"
                                        onClick={() => {
                                          setEspaciosCompletar((prev) =>
                                            prev.map((e) =>
                                              e.label === nombreEspacio
                                                ? {
                                                  ...e,
                                                  respuestas: [...e.respuestas, ""],
                                                }
                                                : e
                                            )
                                          );
                                        }}
                                      >
                                        <Plus size={13} /> Agregar respuesta
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}

                {errForm && (
                  <div className="gp-form-error">
                    <AlertCircle size={15} /> {errForm}
                  </div>
                )}
              </div>

              <div className="gp-page-footer">
                <button className="gp-btn-secondary" onClick={volverALista}>
                  Cancelar
                </button>
                <button
                  className="gp-btn-primary"
                  onClick={handleGuardar}
                  disabled={guardando}
                >
                  {guardando
                    ? "Guardando..."
                    : editando
                      ? "Guardar Cambios"
                      : "Crear Pregunta"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
