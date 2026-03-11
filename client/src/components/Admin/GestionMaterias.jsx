import { useState, useEffect } from "react";
import { api } from "../../services/api";
import "./AdminEstilos/GestionMaterias.css";

// ─── Íconos ───────────────────────────────────────────────────────────────────
const IconFolderPlus = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 28, height: 28 }}
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    <line x1="12" y1="11" x2="12" y2="17" />
    <line x1="9" y1="14" x2="15" y2="14" />
  </svg>
);
const IconBook = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 22, height: 22 }}
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconEdit = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);
const IconTrash = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 14, height: 14 }}
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
);
const IconX = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 18, height: 18 }}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconCheck = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: 16, height: 16 }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─── Paleta de colores cíclica ────────────────────────────────────────────────
const PALETAS = [
  { bg: "#eff6ff", color: "#2563eb" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fef3c7", color: "#d97706" },
  { bg: "#fdf2f8", color: "#9333ea" },
  { bg: "#fff1f2", color: "#e11d48" },
  { bg: "#f0f9ff", color: "#0284c7" },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export default function GestionMaterias() {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [nombreInput, setNombreInput] = useState("");
  const [errModal, setErrModal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { materia } | null

  // ── Cargar materias ─────────────────────────────────────────────────────────
  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getMaterias();
      setMaterias(res.data || []);
    } catch (err) {
      setError(err.message || "Error al cargar materias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // ── Toast éxito ──────────────────────────────────────────────────────────────
  const toast = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  // ── Modal ────────────────────────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null);
    setNombreInput("");
    setErrModal("");
    setModal(true);
  };

  const abrirEditar = (m) => {
    setEditando(m);
    setNombreInput(m.nombre);
    setErrModal("");
    setModal(true);
  };

  const cerrar = () => {
    setModal(false);
    setEditando(null);
    setNombreInput("");
    setErrModal("");
  };

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleGuardar = async () => {
    if (!nombreInput.trim()) return setErrModal("El nombre es obligatorio.");
    setGuardando(true);
    setErrModal("");
    try {
      if (editando) {
        await api.actualizarMateria(editando.id_materia, nombreInput.trim());
        toast("Materia actualizada correctamente.");
      } else {
        await api.crearMateria(nombreInput.trim());
        toast("Materia creada correctamente.");
      }
      await cargar();
      cerrar();
    } catch (err) {
      setErrModal(err.message || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────────
  const handleEliminar = (m) => {
    setConfirmModal({ materia: m });
  };

  const confirmarEliminar = async () => {
    const m = confirmModal?.materia;
    setConfirmModal(null);
    if (!m) return;
    try {
      await api.eliminarMateria(m.id_materia);
      toast("Materia eliminada.");
      await cargar();
    } catch (err) {
      setError(err.message || "Error al eliminar.");
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast */}
      {success && (
        <div className="gm-toast">
          <IconCheck />
          {success}
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmModal && (
        <div className="gm-overlay" onClick={() => setConfirmModal(null)}>
          <div
            className="gm-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gm-confirm-icon">
              <IconTrash />
            </div>
            <h3 className="gm-confirm-title">Eliminar materia</h3>
            <p className="gm-confirm-msg">
              ¿Estás seguro de que deseas eliminar{" "}
              <strong>"{confirmModal.materia.nombre}"</strong>? Esta acción no
              se puede deshacer.
            </p>
            <div className="gm-confirm-actions">
              <button
                className="gm-confirm-btn gm-confirm-btn--cancel"
                onClick={() => setConfirmModal(null)}
              >
                Cancelar
              </button>
              <button
                className="gm-confirm-btn gm-confirm-btn--delete"
                onClick={confirmarEliminar}
              >
                <IconTrash /> Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="gm-header">
        <h2 className="gm-title">Gestión de Materias</h2>
        <p className="gm-subtitle">
          Administra las materias y sus bancos de preguntas
        </p>
      </div>

      {/* Error global */}
      {error && (
        <div className="gm-error-banner">
          {error}
          <button onClick={() => setError("")}>
            <IconX />
          </button>
        </div>
      )}

      {/* Card de acción — Agregar materia */}
      <div className="gm-actions-row">
        <div className="gm-action-card" onClick={abrirCrear}>
          <div className="gm-action-icon gm-icon-green">
            <IconFolderPlus />
          </div>
          <div>
            <h3 className="gm-action-title">Agregar Materias</h3>
            <p className="gm-action-desc">
              Crea una nueva materia con su nombre para comenzar a agregar
              preguntas.
            </p>
            <span className="gm-action-link">Crear nueva materia +</span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="gm-section">
        <div className="gm-section-header">
          <h3 className="gm-section-title">Materias Registradas</h3>
          <span className="gm-badge-count">{materias.length}</span>
        </div>

        {loading ? (
          <div className="gm-state">
            <div className="gm-spinner" />
            <span>Cargando materias...</span>
          </div>
        ) : materias.length === 0 ? (
          <div className="gm-empty">
            <div className="gm-empty-icon">
              <IconBook />
            </div>
            <p>No hay materias registradas.</p>
            <button className="gm-btn-primary" onClick={abrirCrear}>
              Crear primera materia
            </button>
          </div>
        ) : (
          <div className="gm-grid">
            {materias.map((m, i) => {
              const p = PALETAS[i % PALETAS.length];
              return (
                <div
                  key={m.id_materia}
                  className="gm-card"
                  style={{ borderTop: `3px solid ${p.color}` }}
                >
                  <div
                    className="gm-card-icon"
                    style={{ background: p.bg, color: p.color }}
                  >
                    <IconBook />
                  </div>
                  <div className="gm-card-body">
                    <span className="gm-card-nombre">{m.nombre}</span>
                    <span className="gm-card-fecha">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString("es-EC", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Sin fecha"}
                    </span>
                  </div>
                  <div className="gm-card-footer">
                    <button
                      className="gm-btn-edit"
                      onClick={() => abrirEditar(m)}
                    >
                      <IconEdit /> Editar
                    </button>
                    <button
                      className="gm-btn-delete"
                      onClick={() => handleEliminar(m)}
                    >
                      <IconTrash /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="gm-overlay" onClick={cerrar}>
          <div className="gm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gm-modal-header">
              <h3>{editando ? "Editar Materia" : "Crear Nueva Materia"}</h3>
              <button className="gm-modal-close" onClick={cerrar}>
                <IconX />
              </button>
            </div>
            <div className="gm-modal-body">
              <label className="gm-label">Nombre de la Materia</label>
              <input
                className={`gm-input${errModal ? " gm-input--err" : ""}`}
                type="text"
                placeholder="Ej. Matemáticas, Física, Historia..."
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGuardar()}
                autoFocus
              />
              {errModal && <p className="gm-input-error">{errModal}</p>}
            </div>
            <div className="gm-modal-footer">
              <button className="gm-btn-secondary" onClick={cerrar}>
                Cancelar
              </button>
              <button
                className="gm-btn-primary"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando
                  ? "Guardando..."
                  : editando
                    ? "Guardar Cambios"
                    : "Crear Materia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
