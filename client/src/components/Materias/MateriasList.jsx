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
  Calculator,
  FlaskConical,
  Globe,
  Music,
  Code,
  Landmark,
  Dna,
  Microscope,
  BookMarked,
} from "lucide-react";
import { api } from "../../services/api";
import TestMode from "./TestMode";
import ExamMode from "./ExamMode";
import "./Materias.css";
import { useAuth } from "../../context/AuthContext";

const ICONOS = [
  Atom,
  Calculator,
  FlaskConical,
  Globe,
  Music,
  Code,
  Landmark,
  Dna,
  Microscope,
  BookMarked,
];
const PALETAS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#fdf4ff", color: "#9333ea" },
  { bg: "#fff1f2", color: "#e11d48" },
  { bg: "#f0f9ff", color: "#0284c7" },
  { bg: "#fefce8", color: "#ca8a04" },
  { bg: "#f7fee7", color: "#65a30d" },
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

const VISTA = {
  LISTA: "lista",
  DETALLE: "detalle",
  TEST: "test",
  EXAMEN: "examen",
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
  const [examenData, setExamenData] = useState(null);
  const [iniciando, setIniciando] = useState(null);
  const [modosHabilitados, setModosHabilitados] = useState(null);
  const [intentoEnProgreso, setIntentoEnProgreso] = useState(null);
  const { isAdmin } = useAuth();

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
      const cant = Math.min(10, todas.length);
      const mezcla = [...todas].sort(() => Math.random() - 0.5).slice(0, cant);
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
    setExamenData(null);
  };
  const volverALista = () => {
    setVista(VISTA.LISTA);
    setDetalle(null);
    setPreguntasTest([]);
    setExamenData(null);
    setModosHabilitados(null);
    setError("");
  };

  if (vista === VISTA.TEST && preguntasTest.length > 0) {
    return (
      <TestMode
        preguntas={preguntasTest}
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
            <div className="mat-grid">
              {materias.map((m, i) => {
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
                      <Icono size={26} />
                    </div>
                    <div className="mat-card-body">
                      <h3 className="mat-card-nombre">{m.nombre}</h3>
                      {m.descripcion && (
                        <p className="mat-card-desc">{m.descripcion}</p>
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
