import { useState, useEffect } from "react";
import axios from "axios";

export default function ModalCrearUsuario({ isOpen, onClose, onSuccess, editingUser = null }) {
  const [formData, setFormData] = useState({
    correo_institucional: "",
    rol: "ESTUDIANTE",
    limite_dispositivos: 3,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setFormData({
        correo_institucional: editingUser.correo_institucional || "",
        rol: editingUser.rol || "ESTUDIANTE",
        limite_dispositivos: editingUser.limite_dispositivos || 3,
      });
    } else {
      setFormData({
        correo_institucional: "",
        rol: "ESTUDIANTE",
        limite_dispositivos: 3,
      });
    }
  }, [editingUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validar dominio del correo (solo si es nuevo usuario o se cambió el correo)
    if (!formData.correo_institucional.endsWith("@unemi.edu.ec")) {
      setError("El correo debe terminar en @unemi.edu.ec");
      setLoading(false);
      return;
    }

    // Validar límite de dispositivos
    if (
      formData.limite_dispositivos < 1 ||
      formData.limite_dispositivos > 999
    ) {
      setError("El límite debe estar entre 1 y 999");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      if (editingUser) {
        // Actualizar usuario existente
        const response = await axios.put(`/api/v1/usuarios/${editingUser.id_usuario}`, formData, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        if (response.data.ok) {
          alert("Usuario actualizado exitosamente");
          onSuccess();
          onClose();
        } else {
          setError(response.data.error || "Error al actualizar usuario");
        }
      } else {
        // Crear nuevo usuario
        const response = await axios.post("/api/v1/usuarios", formData, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        if (response.data.ok) {
          alert("Usuario creado exitosamente");
          onSuccess();
          onClose();
        } else {
          setError(response.data.error || "Error al crear usuario");
        }
      }
    } catch (err) {
      console.error("Error:", err);
      setError(err.response?.data?.error || "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}</h3>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="alert-error">{error}</div>}

          <div className="modal-field">
            <label htmlFor="correo" >
              Correo Institucional (@unemi.edu.ec){" "}
              <span className="required">*</span>
            </label>
            <input
              id="correo"
              type="email"
              pattern="[a-zA-Z0-9._%+-]+@unemi\.edu\.ec"
              value={formData.correo_institucional}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  correo_institucional: e.target.value,
                })
              }
              required
              placeholder="ejemplo@unemi.edu.ec"
              title="Debe terminar en @unemi.edu.ec"
              disabled={!!editingUser} // Generalmente no se cambia el correo base si es PK o clave de identidad
            />
          </div>

          <div className="modal-field">
            <label htmlFor="rol">Rol</label>
            <select
              id="rol"
              value={formData.rol}
              onChange={(e) =>
                setFormData({ ...formData, rol: e.target.value })
              }
            >
              <option value="ESTUDIANTE">ESTUDIANTE</option>
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
            </select>
          </div>

          <div className="modal-field">
            <label htmlFor="limite">Límite de Dispositivos (1-999)</label>
            <input
              id="limite"
              type="number"
              min="1"
              max="999"
              value={formData.limite_dispositivos}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  limite_dispositivos: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? "Guardando..." : editingUser ? "Actualizar" : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
