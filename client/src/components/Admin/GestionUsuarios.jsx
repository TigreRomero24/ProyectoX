import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./Admin.css";

export default function GestionUsuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para el Modal de Creación/Edición
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  // 👈 ADAPTACIÓN 1: El estado inicial coincide exactamente con el modelo
  const [formData, setFormData] = useState({
    correo_institucional: "",
    password: "",
    rol: "ESTUDIANTE",
    metodo_auth: "LOCAL",
  });

  const fetchUsuarios = useCallback(async () => {
    if (!token) return;

    try {
      const huella = localStorage.getItem("huella_oficial") || "huella_default";

      const response = await fetch("http://localhost:3000/api/usuarios", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Device-Fingerprint": huella,
        },
      });

      const data = await response.json();

      if (data.ok) {
        setUsuarios(data.data);
      } else {
        alert(`Bloqueo del Backend: ${data.codigo || data.mensaje}`);
        console.error("Detalles del rechazo:", data);
      }
    } catch (error) {
      console.error("Error de red/CORS:", error);
    }
  }, [token]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleDelete = async (id_usuario) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?"))
      return;

    setLoading(true);
    try {
      const huella = localStorage.getItem("huella_oficial") || "huella_default";

      const response = await fetch(
        `http://localhost:3000/api/usuarios/${id_usuario}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Device-Fingerprint": huella,
          },
        },
      );
      const data = await response.json();

      if (data.ok) {
        setUsuarios(usuarios.filter((u) => u.id_usuario !== id_usuario));
      } else {
        alert(`Error al eliminar: ${data.mensaje}`);
      }
    } catch (error) {
      console.error("Error eliminando usuario:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = editando
      ? `http://localhost:3000/api/usuarios/${editando.id_usuario}`
      : "http://localhost:3000/api/usuarios";

    const method = editando ? "PUT" : "POST";

    // 👈 ADAPTACIÓN 2: Limpiamos la contraseña si no se escribió una nueva al editar
    const dataToSend = { ...formData };
    if (editando && !dataToSend.password) {
      delete dataToSend.password;
    }

    try {
      const huella = localStorage.getItem("huella_oficial") || "huella_default";
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Device-Fingerprint": huella,
        },
        body: JSON.stringify(dataToSend), // Se envía solo lo que la BD soporta
      });

      const data = await response.json();

      if (data.ok) {
        setModalAbierto(false);
        fetchUsuarios();
      } else {
        alert(data.mensaje || "Error al guardar el usuario");
      }
    } catch (error) {
      console.error("Error guardando usuario:", error);
      alert("Error de conexión al intentar guardar.");
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setEditando(null);
    setFormData({
      correo_institucional: "",
      password: "",
      rol: "ESTUDIANTE",
      metodo_auth: "LOCAL",
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (usuario) => {
    setEditando(usuario);
    setFormData({
      correo_institucional: usuario.correo_institucional,
      password: "", // Nunca mostramos la contraseña hasheada
      rol: usuario.rol,
      metodo_auth: usuario.metodo_auth || "LOCAL",
    });
    setModalAbierto(true);
  };

  return (
    <div className="gestion-usuarios">
      <div
        className="header-seccion"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3>Usuarios Registrados</h3>
        <button
          className="btn-save"
          onClick={abrirModalCrear}
          style={{
            padding: "8px 16px",
            background: "#0056b3",
            color: "white",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Correo Institucional</th>
              <th>Rol</th>
              <th>Método Auth</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id_usuario}>
                <td>{u.id_usuario}</td>
                <td>{u.correo_institucional}</td>
                <td>
                  <span className={`role-badge ${u.rol.toLowerCase()}`}>
                    {u.rol}
                  </span>
                </td>
                {/* 👈 ADAPTACIÓN 3: Mostramos método_auth en lugar del límite */}
                <td>{u.metodo_auth}</td>
                <td style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => abrirModalEditar(u)}
                    className="btn-edit"
                    disabled={loading}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => handleDelete(u.id_usuario)}
                    className="btn-delete"
                    disabled={loading}
                  >
                    {loading ? "..." : "🗑️ Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className="stats"
        style={{
          marginTop: "20px",
          padding: "15px",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <p>
          Total de usuarios: <strong>{usuarios.length}</strong>
        </p>
        <p>
          Administradores:{" "}
          <strong>
            {usuarios.filter((u) => u.rol === "ADMINISTRADOR").length}
          </strong>
        </p>
        <p>
          Estudiantes:{" "}
          <strong>
            {usuarios.filter((u) => u.rol === "ESTUDIANTE").length}
          </strong>
        </p>
      </div>

      {modalAbierto && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>{editando ? "Editar Usuario" : "Crear Nuevo Usuario"}</h4>
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "15px",
                marginTop: "15px",
              }}
            >
              <label>
                Método de Acceso:
                <select
                  value={formData.metodo_auth}
                  onChange={(e) =>
                    setFormData({ ...formData, metodo_auth: e.target.value })
                  }
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                  disabled={!!editando}
                >
                  <option value="LOCAL">
                    Acceso Local (Usuario y Contraseña)
                  </option>
                  <option value="GOOGLE">Acceso Google (Solo Correo)</option>
                </select>
              </label>

              <label style={{ marginTop: "10px", display: "block" }}>
                Correo Institucional (@unemi.edu.ec):
                <input
                  type="email"
                  value={formData.correo_institucional}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      correo_institucional: e.target.value,
                    })
                  }
                  required
                  disabled={!!editando}
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                />
              </label>

              {/* 👈 ADAPTACIÓN 4: Eliminado el input de "Nombre de Usuario" */}

              {formData.metodo_auth === "LOCAL" && (
                <label style={{ marginTop: "10px", display: "block" }}>
                  Contraseña:
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    // Obligatorio al crear, opcional al editar
                    required={!editando && formData.metodo_auth === "LOCAL"}
                    placeholder={
                      editando ? "Dejar en blanco para no cambiar" : ""
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      marginTop: "5px",
                    }}
                  />
                </label>
              )}

              <label>
                Rol del Sistema:
                <select
                  value={formData.rol}
                  onChange={(e) =>
                    setFormData({ ...formData, rol: e.target.value })
                  }
                  style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                >
                  <option value="ESTUDIANTE">ESTUDIANTE</option>
                  <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                  <option value="CONTADOR">CONTADOR</option>
                </select>
              </label>

              {/* 👈 ADAPTACIÓN 5: Eliminado el input de "Límite de Dispositivos" */}

              <div
                className="modal-actions"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  style={{ padding: "8px 16px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  style={{
                    padding: "8px 16px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: "4px",
                  }}
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
