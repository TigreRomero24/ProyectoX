import { useState, useEffect } from "react";
import {
  BookOpen,
  Trophy,
  CheckCircle2,
  TrendingUp,
  Search,
  ChevronDown,
  Download,
  X,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  BadgeCheck,
  ClipboardList,
} from "lucide-react";
import { api } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import "./Historial.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatFecha = (str) => {
  if (!str) return "-";
  return new Date(str).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDuracion = (inicio, fin) => {
  if (!inicio || !fin) return "-";
  const diff = Math.round((new Date(fin) - new Date(inicio)) / 1000);
  const m = Math.floor(diff / 60)
    .toString()
    .padStart(2, "0");
  const s = (diff % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const porcentaje = (intento) => {
  if (!intento) return 0;
  return Math.round((intento.nota_final / 10) * 100);
};

// ─── Datos mock para la vista (se reemplazarán por API) ───────────────────────
const MOCK_MI_HISTORIAL = [
  {
    id_intento: 1,
    configuracion: { modo: "EXAMEN", Materium: { nombre: "Física" } },
    nota_final: 8.5,
    fecha_inicio: "2026-03-09T08:36:00Z",
    fecha_fin: "2026-03-09T08:45:00Z",
    preguntas_correctas: 8,
    total_preguntas: 10,
  },
  {
    id_intento: 2,
    configuracion: { modo: "EXAMEN", Materium: { nombre: "Química" } },
    nota_final: 6.5,
    fecha_inicio: "2026-03-08T09:03:00Z",
    fecha_fin: "2026-03-08T09:12:00Z",
    preguntas_correctas: 6,
    total_preguntas: 10,
  },
  {
    id_intento: 3,
    configuracion: { modo: "TEST", Materium: { nombre: "Matemáticas" } },
    nota_final: 9.5,
    fecha_inicio: "2026-03-07T18:27:00Z",
    fecha_fin: "2026-03-07T18:45:00Z",
    preguntas_correctas: 19,
    total_preguntas: 20,
  },
];

const MOCK_TODOS = [
  {
    id_intento: 1,
    usuario: { nombre: "Juan Pérez", correo: "juan@example.com" },
    configuracion: { modo: "EXAMEN", Materium: { nombre: "Física" } },
    nota_final: 8.5,
    fecha_inicio: "2026-03-09T08:36:00Z",
    fecha_fin: "2026-03-09T08:45:00Z",
    preguntas_correctas: 8,
    total_preguntas: 10,
  },
  {
    id_intento: 2,
    usuario: { nombre: "María González", correo: "maria@example.com" },
    configuracion: { modo: "TEST", Materium: { nombre: "Matemáticas" } },
    nota_final: 9.2,
    fecha_inicio: "2026-03-09T12:18:00Z",
    fecha_fin: "2026-03-09T12:30:00Z",
    preguntas_correctas: 14,
    total_preguntas: 15,
  },
  {
    id_intento: 3,
    usuario: { nombre: "Juan Pérez", correo: "juan@example.com" },
    configuracion: { modo: "EXAMEN", Materium: { nombre: "Química" } },
    nota_final: 6.5,
    fecha_inicio: "2026-03-08T09:03:00Z",
    fecha_fin: "2026-03-08T09:12:00Z",
    preguntas_correctas: 6,
    total_preguntas: 10,
  },
];

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, valor, label, color }) {
  return (
    <div className="hi-stat">
      <div className={`hi-stat-icon hi-stat-icon--${color}`}>{icon}</div>
      <div className={`hi-stat-val hi-stat-val--${color}`}>{valor}</div>
      <div className="hi-stat-label">{label}</div>
    </div>
  );
}

// ─── Fila de tabla ────────────────────────────────────────────────────────────
function FilaIntento({ intento, conUsuario, onClick }) {
  const pct = porcentaje(intento);
  const aprobado = intento.nota_final >= 7;
  const materia =
    intento.configuracion?.Materia?.nombre ||
    intento.configuracion?.Materium?.nombre ||
    "—";
  const modo = intento.configuracion?.modo ?? "EXAMEN";

  return (
    <div className="hi-fila" onClick={() => onClick(intento)}>
      {conUsuario && (
        <div className="hi-fila-usuario">
          <div className="hi-avatar">{intento.usuario?.nombre?.[0] ?? "U"}</div>
          <div>
            <span className="hi-usuario-nombre">{intento.usuario?.nombre}</span>
            <span className="hi-usuario-correo">{intento.usuario?.correo}</span>
          </div>
        </div>
      )}

      <div className="hi-fila-materia">{materia}</div>

      <div className="hi-fila-modo">
        <span className={`hi-modo-badge hi-modo-badge--${modo.toLowerCase()}`}>
          {modo === "EXAMEN" ? (
            <BadgeCheck size={12} />
          ) : (
            <ClipboardList size={12} />
          )}
          {modo === "EXAMEN" ? "Examen" : "Evaluación"}
        </span>
      </div>

      <div className="hi-fila-puntuacion">
        <span className="hi-pct">{pct}%</span>
        <span className="hi-correctas">
          {intento.preguntas_correctas}/{intento.total_preguntas} correctas
        </span>
      </div>

      <div className="hi-fila-fecha">
        <Calendar size={13} className="hi-icon-sm" />
        {formatFecha(intento.fecha_fin || intento.fecha_inicio)}
      </div>

      <div className="hi-fila-duracion">
        <Clock size={13} className="hi-icon-sm" />
        {formatDuracion(intento.fecha_inicio, intento.fecha_fin)}
      </div>

      <div className="hi-fila-estado">
        <span
          className={`hi-estado-badge ${aprobado ? "hi-estado-badge--ok" : "hi-estado-badge--fail"}`}
        >
          {aprobado ? <CheckCircle2 size={11} /> : <X size={11} />}
          {aprobado ? "Aprobado" : "Reprobado"}
        </span>
      </div>
    </div>
  );
}

// ─── Principal ────────────────────────────────────────────────────────────────
export default function Historial() {
  const { isAdmin } = useAuth();

  const [vista, setVista] = useState("mio"); // "mio" | "todos"
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("todas");
  const [filtroModo, setFiltroModo] = useState("todos");
  const [detalleIntento, setDetalleIntento] = useState(null);

  // Cargar datos
  useEffect(() => {
    setLoading(true);
    setError("");
    // TODO: reemplazar MOCK por api real
    setTimeout(() => {
      setDatos(vista === "mio" ? MOCK_MI_HISTORIAL : MOCK_TODOS);
      setLoading(false);
    }, 300);
    // Real:
    // api.getHistorial().then(r => { setDatos(r.data ?? []); setLoading(false); })
    //   .catch(() => { setError("Error al cargar historial"); setLoading(false); });
  }, [vista]);

  // Stats calculadas
  const total = datos.length;
  const aprobados = datos.filter((i) => i.nota_final >= 7).length;
  const promedio =
    total > 0
      ? (datos.reduce((s, i) => s + porcentaje(i), 0) / total).toFixed(1) + "%"
      : "—";
  const tasa = total > 0 ? Math.round((aprobados / total) * 100) + "%" : "—";

  // Opciones de filtro
  const materias = [
    ...new Set(
      datos.map(
        (i) =>
          i.configuracion?.Materia?.nombre ||
          i.configuracion?.Materium?.nombre ||
          "",
      ),
    ),
  ].filter(Boolean);

  // Filtrado
  const filtrados = datos.filter((i) => {
    const mat =
      i.configuracion?.Materia?.nombre ||
      i.configuracion?.Materium?.nombre ||
      "";
    const usr = i.usuario?.nombre ?? "";
    const matchBusq =
      busqueda === "" ||
      mat.toLowerCase().includes(busqueda.toLowerCase()) ||
      usr.toLowerCase().includes(busqueda.toLowerCase());
    const matchMat = filtroMateria === "todas" || mat === filtroMateria;
    const matchModo =
      filtroModo === "todos" || (i.configuracion?.modo ?? "") === filtroModo;
    return matchBusq && matchMat && matchModo;
  });

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroMateria("todas");
    setFiltroModo("todos");
  };

  // ── Detalle ────────────────────────────────────────────────────────────────
  if (detalleIntento) {
    const pct = porcentaje(detalleIntento);
    const aprobado = detalleIntento.nota_final >= 7;
    const materia =
      detalleIntento.configuracion?.Materia?.nombre ||
      detalleIntento.configuracion?.Materium?.nombre ||
      "—";

    return (
      <div className="hi-root">
        <button className="hi-back" onClick={() => setDetalleIntento(null)}>
          <ArrowLeft size={16} /> Volver al historial
        </button>

        <div className="hi-detalle-header">
          <div>
            <h2 className="hi-detalle-titulo">{materia}</h2>
            <div className="hi-detalle-meta">
              <span>
                <Calendar size={13} />{" "}
                {formatFecha(detalleIntento.fecha_inicio)}
              </span>
              <span>
                <Clock size={13} />{" "}
                {formatDuracion(
                  detalleIntento.fecha_inicio,
                  detalleIntento.fecha_fin,
                )}
              </span>
              <span
                className={`hi-modo-badge hi-modo-badge--${(detalleIntento.configuracion?.modo ?? "examen").toLowerCase()}`}
              >
                {detalleIntento.configuracion?.modo === "EXAMEN" ? (
                  <>
                    <BadgeCheck size={11} /> Examen
                  </>
                ) : (
                  <>
                    <ClipboardList size={11} /> Evaluación
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="hi-detalle-nota">
            <span
              className={`hi-detalle-nota-num ${aprobado ? "hi-detalle-nota--ok" : "hi-detalle-nota--fail"}`}
            >
              {pct}%
            </span>
            <span
              className={`hi-estado-badge ${aprobado ? "hi-estado-badge--ok" : "hi-estado-badge--fail"}`}
            >
              {aprobado ? <CheckCircle2 size={11} /> : <X size={11} />}
              {aprobado ? "Aprobado" : "Reprobado"}
            </span>
          </div>
        </div>

        <div className="hi-detalle-stats">
          <div className="hi-dstat">
            <span>{detalleIntento.preguntas_correctas}</span>
            <small>Correctas</small>
          </div>
          <div className="hi-dstat">
            <span>
              {detalleIntento.total_preguntas -
                detalleIntento.preguntas_correctas}
            </span>
            <small>Incorrectas</small>
          </div>
          <div className="hi-dstat">
            <span>{detalleIntento.total_preguntas}</span>
            <small>Total</small>
          </div>
          <div className="hi-dstat">
            <span>{detalleIntento.nota_final}/10</span>
            <small>Nota</small>
          </div>
        </div>

        {/* Respuestas detalle — se muestran cuando api.getIntento devuelva respuestas_detalle */}
        <div className="hi-detalle-placeholder">
          <BookOpen size={32} />
          <p>Para ver el detalle de respuestas haz clic en "Ver respuestas"</p>
          <button
            className="hi-btn hi-btn--primary"
            onClick={async () => {
              try {
                const res = await api.getIntento(detalleIntento.id_intento);
                if (res.ok)
                  setDetalleIntento({ ...detalleIntento, ...res.data });
              } catch {
                /* mostrar error */
              }
            }}
          >
            Ver respuestas
          </button>
        </div>
      </div>
    );
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  return (
    <div className="hi-root">
      {/* Header */}
      <div className="hi-header">
        <div>
          <h2 className="hi-titulo">Historial de Evaluaciones</h2>
          <p className="hi-subtitulo">
            Consulta el registro completo de tests y exámenes realizados
          </p>
        </div>
      </div>

      {/* Tabs — solo admin ve "Todos los Usuarios" */}
      <div className="hi-tabs">
        <button
          className={`hi-tab ${vista === "mio" ? "hi-tab--active" : ""}`}
          onClick={() => setVista("mio")}
        >
          <User size={15} /> Mi Historial
        </button>
        {isAdmin && (
          <button
            className={`hi-tab ${vista === "todos" ? "hi-tab--active" : ""}`}
            onClick={() => setVista("todos")}
          >
            <User size={15} /> Todos los Usuarios
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="hi-stats">
        <StatCard
          icon={<BookOpen size={20} />}
          color="blue"
          valor={total}
          label="Tests Realizados"
        />
        <StatCard
          icon={<Trophy size={20} />}
          color="green"
          valor={promedio}
          label="Promedio General"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          color="teal"
          valor={aprobados}
          label="Tests Aprobados"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          color="orange"
          valor={tasa}
          label="Tasa de Aprobación"
        />
      </div>

      {/* Filtros */}
      <div className="hi-filtros-wrap">
        <div className="hi-filtros-row">
          <div className="hi-search">
            <Search size={15} className="hi-search-icon" />
            <input
              placeholder={
                vista === "todos"
                  ? "Buscar por materia o usuario..."
                  : "Buscar por materia..."
              }
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className="hi-select-wrap">
            <select
              value={filtroMateria}
              onChange={(e) => setFiltroMateria(e.target.value)}
            >
              <option value="todas">Todas las materias</option>
              {materias.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <ChevronDown size={15} className="hi-select-arrow" />
          </div>

          <div className="hi-select-wrap">
            <select
              value={filtroModo}
              onChange={(e) => setFiltroModo(e.target.value)}
            >
              <option value="todos">Todos los modos</option>
              <option value="EXAMEN">Examen</option>
              <option value="TEST">Evaluación</option>
            </select>
            <ChevronDown size={15} className="hi-select-arrow" />
          </div>
        </div>

        <div className="hi-filtros-actions">
          <button className="hi-btn hi-btn--export">
            <Download size={14} /> Exportar a Excel
          </button>
          <button className="hi-btn hi-btn--ghost" onClick={limpiarFiltros}>
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="hi-state">
          <div className="hi-spinner" />
          <span>Cargando...</span>
        </div>
      ) : error ? (
        <div className="hi-state hi-state--error">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="hi-state">
          <BookOpen size={32} />
          <span>No hay registros que coincidan con los filtros</span>
        </div>
      ) : (
        <div className="hi-tabla">
          {/* Cabecera */}
          <div
            className={`hi-tabla-head ${vista === "todos" ? "hi-tabla-head--todos" : ""}`}
          >
            {vista === "todos" && <span>USUARIO</span>}
            <span>MATERIA</span>
            <span>MODO</span>
            <span>PUNTUACIÓN</span>
            <span>FECHA</span>
            <span>DURACIÓN</span>
            <span>ESTADO</span>
          </div>

          {filtrados.map((intento) => (
            <FilaIntento
              key={intento.id_intento}
              intento={intento}
              conUsuario={vista === "todos"}
              onClick={setDetalleIntento}
            />
          ))}
        </div>
      )}
    </div>
  );
}
