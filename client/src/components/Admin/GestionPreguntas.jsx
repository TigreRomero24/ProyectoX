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
import "./AdminEstilos/GesPreguntas.css";

const VISTA = {
  LISTA: "lista",
  CONFIG: "config",
  MODO: "modo",
  TIPO: "tipo",
  FORM: "form",
  EXCEL: "excel",
};
const TIPO_P = { MULTIPLE: "MULTIPLE", VF: "VERDADERO_FALSO" };
const nuevaOpcion = () => ({
  texto: "",
  es_correcta: false,
  _id: Math.random(),
});
const opcionesVF = (correcta = "Verdadero") => [
  { texto: "Verdadero", es_correcta: correcta === "Verdadero", _id: 1 },
  { texto: "Falso", es_correcta: correcta === "Falso", _id: 2 },
];

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
  const [urlImagen, setUrlImagen] = useState("");
  const [opciones, setOpciones] = useState([nuevaOpcion(), nuevaOpcion()]);
  const [vfCorrecta, setVfCorrecta] = useState("Verdadero");
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

  const cargarPreguntas = async (id) => {
    setLoadingPreguntas(true);
    setError("");
    try {
      const res = await api.getPreguntasPorMateria(id, false);
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
    } catch {}
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
    setUrlImagen("");
    setOpciones([nuevaOpcion(), nuevaOpcion()]);
    setVfCorrecta("Verdadero");
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
    setUrlImagen(p.url_imagen || "");
    setTipoPregunta(p.tipo_pregunta);
    if (p.tipo_pregunta === TIPO_P.VF) {
      setVfCorrecta(
        p.opciones?.find((o) => o.es_correcta)?.texto || "Verdadero",
      );
    } else {
      setOpciones(
        (p.opciones || []).map((o) => ({
          texto: o.texto,
          es_correcta: o.es_correcta,
          _id: Math.random(),
        })),
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
    }
    return null;
  };

  // ── Guardar ────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    const err = validar();
    if (err) return setErrForm(err);
    setGuardando(true);
    setErrForm("");

    const opcionesFinales =
      tipoPregunta === TIPO_P.VF
        ? opcionesVF(vfCorrecta)
        : opciones.map(({ texto, es_correcta }) => ({ texto, es_correcta }));

    const datos = {
      id_materia: materiaSeleccionada.id_materia,
      enunciado: enunciado.trim(),
      tipo_pregunta: tipoPregunta,
      opciones: opcionesFinales,
      ...(urlImagen.trim() && { url_imagen: urlImagen.trim() }),
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
          <button
            className="gp-btn-primary"
            onClick={() => setDropdownAbierto(true)}
            disabled={loadingMaterias}
          >
            {loadingMaterias ? "Cargando..." : "Elegir materia"}
          </button>
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
                            className={`gp-tipo-badge gp-tipo-${p.tipo_pregunta === TIPO_P.MULTIPLE ? "mult" : "vf"}`}
                          >
                            {p.tipo_pregunta === TIPO_P.MULTIPLE ? (
                              <>
                                <List size={11} /> Múltiple
                              </>
                            ) : (
                              <>
                                <ToggleLeft size={11} /> V/F
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
                  className="gp-modo-card gp-modo-card--maint"
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

          {/* ═══════ VISTA: TIPO (Múltiple / V/F) ═══════════════════════ */}
          {vista === VISTA.TIPO && (
            <div className="gp-page">
              <div className="gp-page-header">
                <h3>Crear Nueva Pregunta</h3>
                <p>Selecciona el tipo de pregunta:</p>
              </div>
              <div className="gp-tipo-grid">
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
                  <p>Varias opciones, una correcta</p>
                </div>
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
                  {tipoPregunta === TIPO_P.MULTIPLE ? (
                    <>
                      <List size={13} /> Opción Múltiple
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={13} /> Verdadero / Falso
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

                {/* URL imagen */}
                <div className="gp-form-group">
                  <label className="gp-label">
                    URL de imagen{" "}
                    <span className="gp-label-opt">(opcional)</span>
                  </label>
                  <input
                    className="gp-input"
                    type="text"
                    placeholder="https://..."
                    value={urlImagen}
                    onChange={(e) => setUrlImagen(e.target.value)}
                  />
                </div>

                {/* Opciones MULTIPLE */}
                {tipoPregunta === TIPO_P.MULTIPLE && (
                  <div className="gp-form-group">
                    <label className="gp-label">Opciones de Respuesta</label>
                    <p className="gp-hint">
                      Haz clic en el círculo para marcar la respuesta correcta
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
