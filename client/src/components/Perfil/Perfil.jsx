import { useState, useRef, useEffect, useCallback } from "react";
import { User, Mail, Camera, Save, RotateCcw, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { api } from "../../services/api";

export default function Perfil() {
  const { user, actualizarSesion } = useAuth();

  const [nombre, setNombre] = useState(user?.nombre || "");
  const [previewUrl, setPreviewUrl] = useState(user?.url_foto || null);
  const [imagenFile, setImagenFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef(null);

  // Sincronizar si el user del contexto cambia
  useEffect(() => {
    setNombre(user?.nombre || "");
    setPreviewUrl(user?.url_foto || null);
  }, [user?.nombre, user?.url_foto]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const hasChanges =
    nombre !== (user?.nombre || "") ||
    imagenFile !== null;

  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setToast({ type: "error", text: "Formato no permitido. Use JPG, PNG o WebP." });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: "error", text: "La imagen no puede exceder 2MB." });
      return;
    }

    setImagenFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleReset = () => {
    setNombre(user?.nombre || "");
    setPreviewUrl(user?.url_foto || null);
    setImagenFile(null);
    setToast(null);
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;

    setSaving(true);
    setToast(null);

    try {
      const result = await api.updateProfile(nombre, imagenFile);

      if (result.accessToken) {
        actualizarSesion(result.accessToken);
      }

      setImagenFile(null);
      setToast({ type: "success", text: "Perfil actualizado correctamente." });
    } catch (err) {
      setToast({ type: "error", text: err.message || "Error al guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="perfil-root">
      {/* Cabecera */}
      <div className="perfil-header">
        <h1 className="perfil-header-title">Mi Perfil</h1>
        <p className="perfil-header-subtitle">Administra tu información personal</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`perfil-toast perfil-toast--${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Tarjeta principal */}
      <div className="perfil-card">
        {/* Avatar */}
        <div className="perfil-avatar-wrapper">
          <div
            className={`perfil-avatar-zone${dragging ? " dragging" : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Avatar"
                className="perfil-avatar-img"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="perfil-avatar-placeholder">
                <User size={40} />
                <span>Subir foto</span>
              </div>
            )}
            <div className="perfil-avatar-overlay">
              <Camera size={24} />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          <span className="perfil-avatar-hint">
            Haz clic o arrastra una imagen (JPG, PNG, WebP — máx 2MB)
          </span>
        </div>

        {/* Campos */}
        <div className="perfil-fields">
          {/* Correo (solo lectura) */}
          <div className="perfil-field">
            <label className="perfil-label">
              <Mail size={14} />
              Correo institucional
            </label>
            <input
              className="perfil-input"
              type="email"
              value={user?.correo || ""}
              disabled
              readOnly
            />
          </div>

          {/* Nombre */}
          <div className="perfil-field">
            <label className="perfil-label">
              <User size={14} />
              Nombre
            </label>
            <input
              className="perfil-input"
              type="text"
              placeholder="Tu nombre completo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={150}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="perfil-actions">
          <button
            className="perfil-btn perfil-btn--ghost"
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            <RotateCcw size={14} />
            Descartar
          </button>
          <button
            className="perfil-btn perfil-btn--primary"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save size={14} />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
