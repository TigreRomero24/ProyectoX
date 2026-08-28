import { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Search,
  X,
  AlertCircle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Users,
  BookOpen,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";
import { api } from "../../services/api";

const fmtFecha = (f) =>
  f
    ? new Date(f).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// ─── Modal de confirmación de reset ──────────────────────────────────────────
function ModalConfirmarReset({ estudiante, grupo, onConfirmar, onCancelar, reseteando }) {
  return (
    <div className="gi-overlay" onClick={onCancelar}>
      <div className="gi-modal" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
        <div className="gi-modal-head">
          <div className="gi-modal-icon" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
            <RotateCcw size={18} />
          </div>
          <h3>Resetear Intentos</h3>
          <button className="gi-modal-x" onClick={onCancelar}>
            <X size={18} />
          </button>
        </div>

        <div className="gi-modal-body">
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Se marcarán como <strong>ANULADO</strong> los{" "}
            <strong>{grupo.finalizados}</strong> intento(s) finalizado(s) de{" "}
            <strong>{estudiante.nombre}</strong> en el examen{" "}
            <strong>{grupo.modo}</strong> de <strong>{grupo.materia}</strong>.
          </p>
          <p style={{ marginTop: "10px", color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>
            El historial se conserva con estado ANULADO. El estudiante podrá
            volver a intentar hasta <strong>{grupo.intentos_permitidos}</strong> vece(s).
          </p>
        </div>

        <div className="gi-modal-foot">
          <button className="gi-btn-cancel" onClick={onCancelar} disabled={reseteando}>
            Cancelar
          </button>
          <button
            className="gi-btn-confirm"
            style={{ background: "#f59e0b" }}
            onClick={onConfirmar}
            disabled={reseteando}
          >
            {reseteando ? (
              <><span className="gi-spinner" /> Reseteando...</>
            ) : (
              <><RotateCcw size={15} /> Confirmar Reset</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function GestionIntentos() {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  const [grupos, setGrupos] = useState([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);
  const [errorGrupos, setErrorGrupos] = useState("");

  const [modalReset, setModalReset] = useState(null); // { grupo }
  const [reseteando, setReseteando] = useState(false);
  const [toast, setToast] = useState("");

  // Cargar lista de estudiantes al montar
  useEffect(() => {
    api
      .getEstudiantesParaInscripcion()
      .then((res) => setUsuarios(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingUsuarios(false));
  }, []);

  // Cargar intentos cuando cambia el estudiante seleccionado
  const cargarGrupos = useCallback(async (estudiante) => {
    if (!estudiante) return;
    setLoadingGrupos(true);
    setErrorGrupos("");
    setGrupos([]);
    try {
      const res = await api.getIntentosEstudiante(estudiante.id_usuario);
      setGrupos(res.data || []);
    } catch (e) {
      setErrorGrupos(e.message || "Error al cargar los intentos.");
    } finally {
      setLoadingGrupos(false);
    }
  }, []);

  useEffect(() => {
    cargarGrupos(estudianteSeleccionado);
  }, [estudianteSeleccionado, cargarGrupos]);

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nombre?.toLowerCase().includes(q) ||
      u.correo?.toLowerCase().includes(q)
    );
  });

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handleReset = async () => {
    if (!modalReset || !estudianteSeleccionado) return;
    setReseteando(true);
    try {
      const res = await api.resetearIntentos(
        estudianteSeleccionado.id_usuario,
        modalReset.grupo.id_config,
      );
      setModalReset(null);
      mostrarToast(res.mensaje || "Intentos reseteados correctamente.");
      await cargarGrupos(estudianteSeleccionado);
    } catch (e) {
      mostrarToast(e.message || "Error al resetear.");
    } finally {
      setReseteando(false);
    }
  };

  return (
    <div className="gi-root">
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#22c55e",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: "0 4px 20px #0004",
          }}
        >
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Cabecera */}
      <div>
        <h2 className="gi-title">Gestión de Intentos</h2>
        <p className="gi-subtitle">
          Consulta y resetea los intentos de examen de cada estudiante
        </p>
      </div>

      {/* Selector de estudiante */}
      <div style={{ maxWidth: "480px", marginBottom: "24px", position: "relative" }}>
        <label className="gi-label" style={{ marginBottom: "8px", display: "block" }}>
          Seleccionar Estudiante
        </label>

        <button
          className="gp-materia-btn"
          style={{ width: "100%", justifyContent: "space-between" }}
          onClick={() => setDropdownAbierto((v) => !v)}
          disabled={loadingUsuarios}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={15} />
            {estudianteSeleccionado
              ? `${estudianteSeleccionado.nombre} — ${estudianteSeleccionado.correo}`
              : loadingUsuarios
              ? "Cargando estudiantes..."
              : "Selecciona un estudiante"}
          </span>
          <ChevronDown size={15} className={dropdownAbierto ? "gp-chevron-open" : ""} />
        </button>

        {dropdownAbierto && (
          <div
            className="gp-dropdown"
            style={{ position: "absolute", width: "100%", zIndex: 50, top: "100%", marginTop: "4px" }}
          >
            {/* Búsqueda dentro del dropdown */}
            <div style={{ padding: "8px", borderBottom: "1px solid var(--color-border)" }}>
              <div className="gi-search-box">
                <Search size={13} className="gi-search-ico" />
                <input
                  className="gi-search"
                  placeholder="Buscar estudiante..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  autoFocus
                />
                {busqueda && (
                  <button className="gi-search-clr" onClick={() => setBusqueda("")}>
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {usuariosFiltrados.length === 0 ? (
              <div className="gp-dropdown-empty">Sin resultados</div>
            ) : (
              usuariosFiltrados.map((u) => (
                <button
                  key={u.id_usuario}
                  className={`gp-dropdown-item${estudianteSeleccionado?.id_usuario === u.id_usuario ? " gp-dropdown-item--active" : ""}`}
                  onClick={() => {
                    setEstudianteSeleccionado(u);
                    setDropdownAbierto(false);
                    setBusqueda("");
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.nombre}</div>
                    <div style={{ fontSize: "0.78rem", opacity: 0.65 }}>{u.correo}</div>
                  </div>
                  {estudianteSeleccionado?.id_usuario === u.id_usuario && (
                    <CheckCircle2 size={14} />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Panel de intentos */}
      {!estudianteSeleccionado ? (
        <div className="gp-no-materia">
          <div className="gp-no-materia-icon"><Users size={28} /></div>
          <h3>Selecciona un estudiante</h3>
          <p>Elige un estudiante del selector para ver sus intentos de examen.</p>
        </div>
      ) : loadingGrupos ? (
        <div className="gi-td-state" style={{ padding: "40px 0" }}>
          <span className="gi-spinner" /> Cargando intentos...
        </div>
      ) : errorGrupos ? (
        <div className="gi-error-banner">
          <AlertCircle size={14} /> {errorGrupos}
        </div>
      ) : grupos.length === 0 ? (
        <div className="gp-no-materia">
          <div className="gp-no-materia-icon"><BookOpen size={28} /></div>
          <h3>Sin intentos registrados</h3>
          <p>{estudianteSeleccionado.nombre} no tiene intentos de examen aún.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {grupos.map((g) => {
            const agotados = g.finalizados >= g.intentos_permitidos;
            const puedeReset = g.finalizados > 0;

            return (
              <div
                key={g.id_config}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "12px",
                  padding: "20px",
                }}
              >
                {/* Cabecera del grupo */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <BadgeCheck size={16} color="#3b82f6" />
                      <span style={{ fontWeight: 600, fontSize: "1rem" }}>{g.materia}</span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          background: g.modo === "EXAMEN" ? "#059669" + "22" : "#3b82f6" + "22",
                          color: g.modo === "EXAMEN" ? "#059669" : "#3b82f6",
                          fontWeight: 600,
                        }}
                      >
                        {g.modo}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <span>Finalizados: <strong>{g.finalizados}</strong> / {g.intentos_permitidos}</span>
                      {g.anulados > 0 && (
                        <span style={{ color: "#f59e0b" }}>Anulados: <strong>{g.anulados}</strong></span>
                      )}
                      {agotados && (
                        <span style={{ color: "#ef4444", fontWeight: 600 }}>⚠ Intentos agotados</span>
                      )}
                    </div>
                  </div>

                  <button
                    className="gp-btn-primary"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: puedeReset ? "#f59e0b" : "#6b7280",
                      cursor: puedeReset ? "pointer" : "not-allowed",
                      opacity: puedeReset ? 1 : 0.5,
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                    }}
                    disabled={!puedeReset}
                    title={puedeReset ? "Resetear intentos finalizados" : "No hay intentos finalizados para resetear"}
                    onClick={() => puedeReset && setModalReset({ grupo: g })}
                  >
                    <RefreshCw size={14} /> Resetear Intentos
                  </button>
                </div>

                {/* Lista de intentos */}
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {g.intentos.map((i) => (
                    <div
                      key={i.id_intento}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: i.estado === "ANULADO"
                          ? "#f59e0b11"
                          : i.nota_final >= 7
                          ? "#22c55e11"
                          : "#ef444411",
                        fontSize: "0.85rem",
                      }}
                    >
                      {i.estado === "ANULADO" ? (
                        <XCircle size={15} color="#f59e0b" />
                      ) : i.nota_final >= 7 ? (
                        <CheckCircle2 size={15} color="#22c55e" />
                      ) : (
                        <XCircle size={15} color="#ef4444" />
                      )}

                      <span style={{ flex: 1 }}>
                        Intento #{i.id_intento}
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          color: i.estado === "ANULADO"
                            ? "#f59e0b"
                            : i.nota_final >= 7 ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {i.estado === "ANULADO" ? "ANULADO" : `${i.nota_final} / 10`}
                      </span>

                      <span style={{ color: "var(--color-text-secondary)", minWidth: "140px", textAlign: "right" }}>
                        {fmtFecha(i.fecha_fin)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación */}
      {modalReset && (
        <ModalConfirmarReset
          estudiante={estudianteSeleccionado}
          grupo={modalReset.grupo}
          onConfirmar={handleReset}
          onCancelar={() => setModalReset(null)}
          reseteando={reseteando}
        />
      )}
    </div>
  );
}