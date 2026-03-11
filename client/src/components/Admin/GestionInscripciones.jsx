import { useState, useEffect, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Search,
  UserPlus,
  Calendar,
  ChevronDown,
  X,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { api } from "../../services/api";
import "./AdminEstilos/Gestioninscripciones.css";

// ─── Modal Nueva Inscripción ──────────────────────────────────────────────────
function ModalNuevaInscripcion({ onClose, onSuccess }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [form, setForm] = useState({
    id_usuario: "",
    id_materia: "",
    modo_evaluacion: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEstudiantesParaInscripcion(),
      api.getMateriasParaInscripcion(),
    ])
      .then(([est, mat]) => {
        setEstudiantes(est.data || []);
        setMaterias(mat.data || []);
      })
      .catch(() => setError("Error al cargar datos del formulario."))
      .finally(() => setCargando(false));
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.id_usuario || !form.id_materia || !form.modo_evaluacion) {
      setError("Todos los campos son requeridos.");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await api.crearInscripcion(
        parseInt(form.id_usuario),
        parseInt(form.id_materia),
        form.modo_evaluacion,
      );
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.message || "Error al crear la inscripción.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="gi-overlay" onClick={onClose}>
      <div className="gi-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gi-modal-head">
          <div className="gi-modal-icon">
            <UserPlus size={18} />
          </div>
          <h3>Nueva Inscripción</h3>
          <button className="gi-modal-x" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="gi-modal-body">
          {error && (
            <div className="gi-inline-error">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {cargando ? (
            <div className="gi-modal-loading">
              <span className="gi-spinner" /> Cargando datos...
            </div>
          ) : (
            <>
              {/* Estudiante */}
              <div className="gi-field">
                <label className="gi-label">Estudiante</label>
                <div className="gi-sel-wrap">
                  <select
                    className="gi-select"
                    value={form.id_usuario}
                    onChange={(e) => set("id_usuario", e.target.value)}
                  >
                    <option value="">Selecciona un estudiante...</option>
                    {estudiantes.map((e) => (
                      <option key={e.id_usuario} value={e.id_usuario}>
                        {e.nombre} — {e.correo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="gi-sel-icon" />
                </div>
              </div>

              {/* Materia */}
              <div className="gi-field">
                <label className="gi-label">Materia</label>
                <div className="gi-sel-wrap">
                  <select
                    className="gi-select"
                    value={form.id_materia}
                    onChange={(e) => set("id_materia", e.target.value)}
                  >
                    <option value="">Selecciona una materia...</option>
                    {materias.map((m) => (
                      <option key={m.id_materia} value={m.id_materia}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="gi-sel-icon" />
                </div>
              </div>

              {/* Modo evaluación */}
              <div className="gi-field">
                <label className="gi-label">Modo de Evaluación</label>
                <div className="gi-modo-grid">
                  <button
                    type="button"
                    className={`gi-modo-card${form.modo_evaluacion === "TEST" ? " gi-modo-card--active" : ""}`}
                    onClick={() => set("modo_evaluacion", "TEST")}
                  >
                    <span className="gi-modo-emoji">📝</span>
                    <span className="gi-modo-name">Test</span>
                    <span className="gi-modo-desc">
                      Práctica con feedback inmediato
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`gi-modo-card${form.modo_evaluacion === "EXAMEN" ? " gi-modo-card--active" : ""}`}
                    onClick={() => set("modo_evaluacion", "EXAMEN")}
                  >
                    <span className="gi-modo-emoji">📋</span>
                    <span className="gi-modo-name">Examen</span>
                    <span className="gi-modo-desc">
                      Evaluación formal con nota final
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="gi-modal-foot">
          <button
            className="gi-btn-cancel"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            className="gi-btn-confirm"
            onClick={handleSubmit}
            disabled={guardando || cargando}
          >
            {guardando ? (
              <>
                <span className="gi-spinner" />
                Inscribiendo...
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Inscribir Estudiante
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestionInscripciones() {
  const [inscripciones, setInscripciones] = useState([]);
  const [resumen, setResumen] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
  });
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async (q = "") => {
    setLoading(true);
    setError("");
    try {
      const [ins, res] = await Promise.all([
        api.getInscripciones(q),
        api.getResumenInscripciones(),
      ]);
      setInscripciones(ins.data || []);
      setResumen(res.data || { total: 0, activos: 0, inactivos: 0 });
    } catch {
      setError("Error al cargar inscripciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Búsqueda con debounce 350ms
  useEffect(() => {
    const t = setTimeout(() => cargar(busqueda), 350);
    return () => clearTimeout(t);
  }, [busqueda, cargar]);

  const rowKey = (ins) =>
    `${ins.id_usuario}-${ins.id_materia}-${ins.modo_evaluacion}`;

  const handleToggle = async (ins) => {
    setLoadingId(rowKey(ins));
    try {
      await api.cambiarEstadoInscripcion(
        ins.id_usuario,
        ins.id_materia,
        ins.modo_evaluacion,
        !ins.activo,
      );
      await cargar(busqueda);
    } catch (e) {
      setError(e.message || "Error al cambiar estado.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleEliminar = async (ins) => {
    if (ins.activo) {
      setError("Desactiva la inscripción antes de eliminarla.");
      return;
    }
    if (
      !window.confirm(
        `¿Eliminar inscripción de "${ins.nombre_usuario}" en ${ins.nombre_materia}?`,
      )
    )
      return;
    setLoadingId(rowKey(ins));
    try {
      await api.eliminarInscripcion(
        ins.id_usuario,
        ins.id_materia,
        ins.modo_evaluacion,
      );
      await cargar(busqueda);
    } catch (e) {
      setError(e.message || "Error al eliminar.");
    } finally {
      setLoadingId(null);
    }
  };

  const fmtFecha = (f) =>
    f
      ? new Date(f).toLocaleDateString("es-EC", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="gi-root">
      {/* Cabecera */}
      <div>
        <h2 className="gi-title">Gestión de Inscripción</h2>
        <p className="gi-subtitle">
          Administra las inscripciones de estudiantes a las materias
        </p>
      </div>

      {error && (
        <div className="gi-error-banner">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="gi-stats">
        <div className="gi-stat">
          <div className="gi-stat-icon gi-stat-icon--blue">
            <Users size={22} />
          </div>
          <div>
            <p className="gi-stat-lbl">Total Inscripciones</p>
            <p className="gi-stat-num">{resumen.total}</p>
          </div>
        </div>
        <div className="gi-stat">
          <div className="gi-stat-icon gi-stat-icon--green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="gi-stat-lbl">Activos</p>
            <p className="gi-stat-num">{resumen.activos}</p>
          </div>
        </div>
        <div className="gi-stat">
          <div className="gi-stat-icon gi-stat-icon--red">
            <XCircle size={22} />
          </div>
          <div>
            <p className="gi-stat-lbl">Inactivos</p>
            <p className="gi-stat-num">{resumen.inactivos}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="gi-toolbar">
        <div className="gi-search-box">
          <Search size={15} className="gi-search-ico" />
          <input
            className="gi-search"
            placeholder="Buscar por nombre, email o materia..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="gi-search-clr" onClick={() => setBusqueda("")}>
              <X size={13} />
            </button>
          )}
        </div>
        <button className="gi-btn-add" onClick={() => setModalOpen(true)}>
          <UserPlus size={15} /> Nueva Inscripción
        </button>
      </div>

      {/* Tabla */}
      <div className="gi-table-wrap">
        <table className="gi-table">
          <thead>
            <tr>
              <th>Estudiante</th>
              <th>Materia</th>
              <th>Modo</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="gi-td-state">
                  <span className="gi-spinner" /> Cargando...
                </td>
              </tr>
            ) : inscripciones.length === 0 ? (
              <tr>
                <td colSpan={6} className="gi-td-state">
                  <BookOpen size={30} className="gi-empty-icon" />
                  {busqueda
                    ? `Sin resultados para "${busqueda}"`
                    : "No hay inscripciones registradas."}
                </td>
              </tr>
            ) : (
              inscripciones.map((ins) => {
                const busy = loadingId === rowKey(ins);
                return (
                  <tr key={rowKey(ins)} className={busy ? "gi-row--busy" : ""}>
                    {/* Estudiante */}
                    <td>
                      <p className="gi-student-name">{ins.nombre_usuario}</p>
                      <p className="gi-student-email">{ins.correo}</p>
                    </td>

                    {/* Materia */}
                    <td className="gi-td-mat">{ins.nombre_materia}</td>

                    {/* Modo */}
                    <td>
                      <span
                        className={`gi-badge-modo gi-badge-modo--${ins.modo_evaluacion.toLowerCase()}`}
                      >
                        {ins.modo_evaluacion === "TEST"
                          ? "📝 Test"
                          : "📋 Examen"}
                      </span>
                    </td>

                    {/* Fecha */}
                    <td>
                      <span className="gi-fecha">
                        <Calendar size={12} /> {fmtFecha(ins.fecha_inscripcion)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td>
                      <span
                        className={`gi-badge-status gi-badge-status--${ins.activo ? "on" : "off"}`}
                      >
                        {ins.activo ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <XCircle size={12} />
                        )}
                        {ins.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="gi-actions">
                        <label
                          className={`gi-sw${ins.activo ? " gi-sw--on" : ""}${busy ? " gi-sw--off" : ""}`}
                          title={ins.activo ? "Desactivar" : "Activar"}
                        >
                          <input
                            type="checkbox"
                            checked={ins.activo}
                            disabled={busy}
                            onChange={() => handleToggle(ins)}
                          />
                          <span className="gi-sw-track" />
                        </label>

                        <button
                          className="gi-btn-del"
                          onClick={() => handleEliminar(ins)}
                          disabled={busy || ins.activo}
                          title={
                            ins.activo
                              ? "Desactiva primero para eliminar"
                              : "Eliminar inscripción"
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ModalNuevaInscripcion
          onClose={() => setModalOpen(false)}
          onSuccess={() => cargar(busqueda)}
        />
      )}
    </div>
  );
}
