import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Trash2,
  ShieldCheck,
  GraduationCap,
  UserCheck,
  UserX,
  AlertCircle,
} from "lucide-react";
import ModalCrearUsuario from "./ModalCrearUsuario";
import "./AdminEstilos/Gestionusuarios.css";

const normalizarBooleano = (valor) =>
  valor === true || valor === "true" || valor === 1 || valor === "1";

export default function GestionUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token");

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/v1/usuarios", {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (res.data.ok) setUsuarios(res.data.data);
    } catch (e) {
      setErrorMsg("Error al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleToggleActivo = async (usuario) => {
    const estadoActual = normalizarBooleano(usuario.activo);
    const nuevoEstado = !estadoActual;
    setLoadingId(usuario.id_usuario);
    try {
      const res = await axios.patch(
        `/api/v1/usuarios/${usuario.id_usuario}/estado`,
        { estado: nuevoEstado },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        },
      );
      if (res.data.ok) {
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id_usuario === usuario.id_usuario
              ? { ...u, activo: nuevoEstado }
              : u,
          ),
        );
      }
    } catch (e) {
      setErrorMsg(
        e.response?.data?.error ||
          e.response?.data?.mensaje ||
          "Error al cambiar el estado.",
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (usuario) => {
    if (normalizarBooleano(usuario.activo)) {
      setErrorMsg(
        "Debes desactivar el usuario antes de eliminarlo permanentemente.",
      );
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?"))
      return;
    setLoadingId(usuario.id_usuario);
    try {
      const res = await axios.delete(`/api/v1/usuarios/${usuario.id_usuario}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (res.status === 200 && res.data.ok) {
        setUsuarios((prev) =>
          prev.filter((u) => u.id_usuario !== usuario.id_usuario),
        );
      }
    } catch (e) {
      setErrorMsg(e.response?.data?.error || "Error al eliminar usuario.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="gu-root">
      {/* Cabecera */}
      <div className="gu-header">
        <div>
          <h2 className="gu-title">Gestión de Usuarios</h2>
          <p className="gu-subtitle">
            Administra los usuarios de la plataforma
          </p>
        </div>
        <button className="gu-btn-add" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Agregar Usuarios
        </button>
      </div>

      {errorMsg && (
        <div className="gu-error-banner">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
          <button className="gu-error-close" onClick={() => setErrorMsg("")}>
            ✕
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="gu-table-wrap">
        <table className="gu-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="gu-td-state">
                  <span className="gu-spinner" /> Cargando usuarios...
                </td>
              </tr>
            ) : usuarios.length === 0 ? (
              <tr>
                <td colSpan={5} className="gu-td-state">
                  No hay usuarios registrados.
                </td>
              </tr>
            ) : (
              usuarios.map((u) => {
                const isActivo = normalizarBooleano(u.activo);
                const isAdmin = u.rol === "ADMINISTRADOR";
                const busy = loadingId === u.id_usuario;

                return (
                  <tr key={u.id_usuario} className={busy ? "gu-row--busy" : ""}>
                    <td className="gu-td-id">#{u.id_usuario}</td>
                    <td className="gu-td-email">{u.correo_institucional}</td>
                    <td>
                      <span
                        className={`gu-badge gu-badge--${isAdmin ? "admin" : "student"}`}
                      >
                        {isAdmin ? (
                          <ShieldCheck size={12} />
                        ) : (
                          <GraduationCap size={12} />
                        )}
                        {isAdmin ? "Administrador" : "Estudiante"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`gu-badge gu-badge--${isActivo ? "active" : "inactive"}`}
                      >
                        {isActivo ? (
                          <UserCheck size={12} />
                        ) : (
                          <UserX size={12} />
                        )}
                        {isActivo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="gu-actions">
                        {/* Toggle activar/desactivar */}
                        <label
                          className={`gu-switch${isActivo ? " gu-switch--on" : ""}${busy ? " gu-switch--disabled" : ""}`}
                          title={
                            isActivo ? "Desactivar usuario" : "Activar usuario"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isActivo}
                            disabled={busy}
                            onChange={() => handleToggleActivo(u)}
                          />
                          <span className="gu-switch-track" />
                        </label>

                        {/* Eliminar — botón con texto e ícono inline */}
                        <button
                          className="gu-btn-delete"
                          onClick={() => handleDelete(u)}
                          disabled={busy || isActivo}
                          title={
                            isActivo
                              ? "Desactiva primero para eliminar"
                              : "Eliminar usuario"
                          }
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="15"
                            height="15"
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

      <ModalCrearUsuario
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchUsuarios}
      />
    </div>
  );
}
