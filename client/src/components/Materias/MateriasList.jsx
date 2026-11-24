import { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
  BadgeCheck,
  Clock,
  RotateCcw,
  AlertCircle,
  CheckCheck,
  Atom,
  Layers,
} from "lucide-react";
import { api } from "../../services/api";
import TestMode from "./TestMode";
import ExamMode from "./ExamMode";
import Flashcards from "./Flashcards";

import { useAuth } from "../../hooks/useAuth";

const ICONOS = [
  Atom,
];
const PALETAS = [
  { bg: "#eff6ff", color: "#2563eb" }
];
const getPaleta = (i) => PALETAS[i % PALETAS.length];
const getIcono = (i) => ICONOS[i % ICONOS.length];

const INFO_MODO = {
  TEST: {
    label: "Modo Evaluación",
    desc: "Practica con preguntas de la materia. Al responder verás si fue correcto con feedback inmediato.",
    items: ["Sin límite de tiempo", "Feedback inmediato", "Modo práctica"],
    btnLabel: "Comenzar Evaluación",
    iconBg: "#1d4ed8",
    iconColor: "#fff",
    btnClass: "mat-btn-test",
  },
  EXAMEN: {
    label: "Modo Examen",
    desc: "Pon a prueba tus conocimientos. Sin feedback hasta entregar. Obtén una calificación final.",
    items: ["Tiempo limitado", "Calificación al final", "Evaluación formal"],
    btnLabel: "Iniciar Examen",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    btnClass: "mat-btn-examen",
  },
};

const ALERTA = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#fef3c7",
  color: "#b45309",
};
const etiquetaSemestre = (sem) =>
  sem === "TODOS" ? "Todos" : sem === "SIN" ? "Sin semestre" : `${sem}.º semestre`;

const VISTA = {
  LISTA: "lista",
  DETALLE: "detalle",
  TEST: "test",
  EXAMEN: "examen",
  FLASHCARDS: "flashcards",
};

export default function MateriasList() {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [vista, setVista] = useState(VISTA.LISTA);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [preguntasTest, setPreguntasTest] = useState([]);
  const [loadingTest, setLoadingTest] = useState(false);
  const [preguntasFlash, setPreguntasFlash] = useState([]);
  const [loadingFlash, setLoadingFlash] = useState(false);
  const [examenData, setExamenData] = useState(null);
  const [iniciando, setIniciando] = useState(null);
  const [modosHabilitados, setModosHabilitados] = useState(null);
  const [intentoEnProgreso, setIntentoEnProgreso] = useState(null);
  const { isAdmin } = useAuth();
  const [busqueda, setBusqueda] = useState("");
  const [filtroSemestre, setFiltroSemestre] = useState("TODOS");

  // Semestres presentes ("SIN" = materias sin semestre asignado).
  const semestres = [...new Set(materias.map((m) => m.semestre ?? "SIN"))].sort(
    (a, b) => (a === "SIN") - (b === "SIN") || a - b,
  );
  const q = busqueda.trim().toLowerCase();
  const grupos = semestres
    .filter((sem) => filtroSemestre === "TODOS" || filtroSemestre === sem)
    .map((sem) => [
      sem,
      materias.filter(
        (m) => (m.semestre ?? "SIN") === sem && m.nombre.toLowerCase().includes(q),
      ),
    ])
    .filter(([, lista]) => lista.length > 0);

  useEffect(() => {
    (async () => {
      try {
        const res = isAdmin
          ? await api.getMaterias()
          : await api.getMisMaterias();
        setMaterias(res.data || []);
      } catch (e) {
        setError(e.message || "Error al cargar materias.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  const toast = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const verDetalle = async (materia) => {
    setLoadingDetalle(true);
    setError("");
    try {
      const res = await api.getConfiguracionesPorMateria(materia.id_materia);

      if (!isAdmin && materia.modos_inscritos) {
        setModosHabilitados(materia.modos_inscritos);
        res.data.configuraciones = res.data.configuraciones.filter((c) =>
          materia.modos_inscritos.includes(c.modo),
        );
      } else {
        setModosHabilitados(null);
      }

      setDetalle(res.data);
      setVista(VISTA.DETALLE);
    } catch (e) {
      setError(e.message || "Error al cargar configuraciones.");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const iniciarTest = async () => {
    setLoadingTest(true);
    setError("");
    try {
      const res = await api.getPreguntasTest(detalle.materia.id_materia);
      const todas = res.data || [];
      // 🔥 CAMBIO: TEST ya no limita a 10 — entran todas las preguntas activas,
      // solo se mezcla el orden (las opciones de cada pregunta se mezclan
      // dentro de TestMode/OrdenarRenderer/etc. si aplica).
      const mezcla = [...todas].sort(() => Math.random() - 0.5);
      if (!mezcla.length) {
        setError("No hay preguntas activas.");
        return;
      }
      setPreguntasTest(mezcla);
      setVista(VISTA.TEST);
    } catch (e) {
      setError(e.message || "Error al cargar preguntas.");
    } finally {
      setLoadingTest(false);
    }
  };

  const iniciarFlashcards = async () => {
    setLoadingFlash(true);
    setError("");
    try {
      const res = await api.getPreguntasTest(detalle.materia.id_materia);
      const todas = res.data || [];
      if (!todas.length) {
        setError("No hay preguntas activas.");
        return;
      }
      setPreguntasFlash(todas);
      setVista(VISTA.FLASHCARDS);
    } catch (e) {
      setError(e.message || "Error al cargar preguntas.");
    } finally {
      setLoadingFlash(false);
    }
  };

  const iniciarExamen = async (config) => {
    setIniciando(config.id_config);
    setError("");
    setIntentoEnProgreso(null);
    try {
      const res = await api.iniciarExamen(config.id_config);
      setExamenData({ ...res.data, modo: config.modo });
      toast("¡Examen iniciado!");
      setVista(VISTA.EXAMEN);
    } catch (e) {
      if (e.message === "INTENTO_EN_PROGRESO" && e.id_intento) {
        setIntentoEnProgreso({ id_intento: e.id_intento, config });
        setError("Tienes un examen en progreso sin finalizar.");
      } else {
        setError(
          e.message?.replace("RESTRICCION: ", "") ||
            "Error al iniciar el examen.",
        );
      }
    } finally {
      setIniciando(null);
    }
  };

  const retomarExamen = async () => {
    if (!intentoEnProgreso) return;
    setIniciando(intentoEnProgreso.config.id_config);
    setError("");
    try {
      const res = await api.retomarExamen(intentoEnProgreso.id_intento);
      setExamenData({ ...res.data, modo: intentoEnProgreso.config.modo });
      setIntentoEnProgreso(null);
      setVista(VISTA.EXAMEN);
    } catch (e) {
      setError("No se pudo retomar el examen. Intenta de nuevo.");
    } finally {
      setIniciando(null);
    }
  };

  const handleIniciar = (config) =>
    config.modo === "TEST" ? iniciarTest() : iniciarExamen(config);

  const volverADetalle = () => {
    setVista(VISTA.DETALLE);
    setPreguntasTest([]);
    setPreguntasFlash([]);
    setExamenData(null);
  };
  const volverALista = () => {
    setVista(VISTA.LISTA);
    setDetalle(null);
    setPreguntasTest([]);
    setPreguntasFlash([]);
    setExamenData(null);
    setModosHabilitados(null);
    setError("");
  };

  if (vista === VISTA.TEST && preguntasTest.length > 0) {
    return (
      <TestMode
        preguntas={preguntasTest}
        nombreMateria={detalle?.materia?.nombre || ""}
        idMateria={detalle?.materia?.id_materia}
        onVolver={volverADetalle}
      />
    );
  }
  if (vista === VISTA.FLASHCARDS && preguntasFlash.length > 0) {
    return (
      <Flashcards
        preguntas={preguntasFlash}
        nombreMateria={detalle?.materia?.nombre || ""}
        onVolver={volverADetalle}
      />
    );
  }
  if (vista === VISTA.EXAMEN && examenData) {
    return (
      <ExamMode
        examenData={examenData}
        nombreMateria={detalle?.materia?.nombre || ""}
        onVolver={volverALista}
      />
    );
  }

  return (
    <div className="mat-root">
      {success && (
        <div className="mat-toast">
          <CheckCheck size={16} />
          {success}
        </div>
      )}

      {/* ── LISTA ─────────────────────────────────────────────────────── */}
      {vista === VISTA.LISTA && (
        <>
          <div className="mat-header">
            <h2 className="mat-title">Materias Registradas</h2>
            <p className="mat-subtitle">
              Explora todas las materias disponibles en la plataforma
            </p>
          </div>

          {error && (
            <div className="mat-error-banner">
              <AlertCircle size={15} />
              {error}
              <button onClick={() => setError("")}>✕</button>
            </div>
          )}

          {loading ? (
            <div className="mat-state">
              <div className="mat-spinner" />
              <span>Cargando materias...</span>
            </div>
          ) : materias.length === 0 ? (
            <div className="mat-empty">
              <div className="mat-empty-icon">
                <BookOpen size={26} />
              </div>
              <p>No hay materias disponibles.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <input
                  type="search"
                  placeholder="Buscar materia..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  style={{ flex: "1 1 220px", padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1" }}
                />
                {["TODOS", ...semestres].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setFiltroSemestre(sem)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "1px solid #cbd5e1",
                      background: filtroSemestre === sem ? "#2563eb" : "#fff",
                      color: filtroSemestre === sem ? "#fff" : "#334155",
                      cursor: "pointer",
                    }}
                  >
                    {etiquetaSemestre(sem)}
                  </button>
                ))}
              </div>
              {grupos.length === 0 && (
                <p className="mat-subtitle">Ninguna materia coincide con la búsqueda.</p>
              )}
              {grupos.map(([sem, lista]) => (
                <section key={sem} style={{ marginBottom: 24 }}>
                  <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#334155" }}>
                    {etiquetaSemestre(sem)} <small style={{ color: "#94a3b8" }}>({lista.length})</small>
                  </h3>
                  <div className="mat-grid">
                    {lista.map((m, i) => {
                const p = getPaleta(i);
                const Icono = getIcono(i);
                return (
                  <div
                    key={m.id_materia}
                    className="mat-card"
                    style={{ borderTop: `3px solid ${p.color}` }}
                  >
                    <div
                      className="mat-card-icon"
                      style={{ background: p.bg, color: p.color }}
                    >
                      {m.img ? (
                        <img src={m.img} alt={m.nombre} className="mat-card-img" />
                      ) : (
                        <Icono size={26} />
                      )}
                    </div>
                    <div className="mat-card-body">
                      <h3 className="mat-card-nombre">{m.nombre}</h3>
                      {m.descripcion && (
                        <p className="mat-card-desc">{m.descripcion}</p>
                      )}
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                          {m.total_preguntas === 0 && (
                            <span style={ALERTA}>Sin preguntas</span>
                          )}
                          {m.total_configuraciones === 0 && (
                            <span style={ALERTA}>Sin cuestionario</span>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      className="mat-card-footer"
                      onClick={() => verDetalle(m)}
                      disabled={loadingDetalle}
                    >
                      <span>Ver Detalles</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </>
      )}

      {/* ── DETALLE ───────────────────────────────────────────────────── */}
      {vista === VISTA.DETALLE && detalle && (
        <>
          <div className="mat-breadcrumb">
            <button onClick={volverALista}>Materias</button>
            <ChevronRight size={14} />
            <span>{detalle.materia.nombre}</span>
          </div>

          <div className="mat-detail-header">
            <button className="mat-back-btn" onClick={volverALista}>
              <ArrowLeft size={16} /> Materias
            </button>
            <div>
              <h2 className="mat-title">{detalle.materia.nombre}</h2>
              <p className="mat-subtitle">
                {detalle.total_preguntas_activas} preguntas disponibles
              </p>
            </div>
          </div>

          {error && (
            <div className="mat-error-banner">
              <AlertCircle size={15} />
              <span>{error}</span>
              <button
                style={{ marginLeft: "auto" }}
                onClick={() => {
                  setError("");
                  setIntentoEnProgreso(null);
                }}
              >
                ✕
              </button>
            </div>
          )}
          {detalle.total_preguntas_activas === 0 && (
            <div className="mat-warn-banner">
              <AlertCircle size={15} />
              Esta materia aún no tiene preguntas activas.
            </div>
          )}

          {detalle.total_preguntas_activas > 0 && (
            <button
              className="mat-flash-btn"
              onClick={iniciarFlashcards}
              disabled={loadingFlash}
            >
              <Layers size={16} />
              {loadingFlash ? "Cargando..." : "Repaso relámpago (flashcards)"}
            </button>
          )}

          {detalle.configuraciones.length === 0 ? (
            <div className="mat-empty">
              <div className="mat-empty-icon">
                <ClipboardList size={26} />
              </div>
              <p>
                {modosHabilitados
                  ? "No hay evaluaciones configuradas para tus modos habilitados."
                  : "No hay evaluaciones configuradas."}
              </p>
            </div>
          ) : (
            <div className="mat-modos-grid">
              {detalle.configuraciones.map((config) => {
                const info = INFO_MODO[config.modo] || INFO_MODO.TEST;
                const sinPreg = detalle.total_preguntas_activas === 0;
                const carg =
                  iniciando === config.id_config ||
                  (config.modo === "TEST" && loadingTest);
                return (
                  <div
                    key={config.id_config}
                    className={`mat-modo-card mat-modo-card--${config.modo.toLowerCase()}`}
                  >
                    <div
                      className="mat-modo-icon"
                      style={{ background: info.iconBg }}
                    >
                      {config.modo === "TEST" ? (
                        <ClipboardList size={28} color={info.iconColor} />
                      ) : (
                        <BadgeCheck size={28} color={info.iconColor} />
                      )}
                    </div>
                    <h3 className="mat-modo-title">{info.label}</h3>
                    <p className="mat-modo-desc">{info.desc}</p>
                    <div className="mat-modo-meta">
                      <span>
                        <Clock size={13} />
                        {config.tiempo_limite_min
                          ? `${config.tiempo_limite_min} min`
                          : "Sin límite de tiempo"}
                      </span>
                      <span>
                        <RotateCcw size={13} />
                        {config.intentos_permitidos} intento
                        {config.intentos_permitidos !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <ul className="mat-modo-list">
                      {info.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                    <button
                      className={`mat-modo-btn ${info.btnClass}`}
                      onClick={() => handleIniciar(config)}
                      disabled={carg || sinPreg}
                    >
                      {carg ? (
                        <>
                          <div className="mat-spinner-sm" /> Cargando...
                        </>
                      ) : (
                        <>
                          {config.modo === "TEST" ? (
                            <ClipboardList size={18} />
                          ) : (
                            <BadgeCheck size={18} />
                          )}
                          {info.btnLabel}
                        </>
                      )}
                    </button>

                    {intentoEnProgreso?.config?.id_config ===
                      config.id_config && (
                      <button
                        className="mat-modo-btn mat-btn-retomar"
                        onClick={retomarExamen}
                        disabled={!!iniciando}
                      >
                        <RotateCcw size={18} />
                        Retomar examen en progreso
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
