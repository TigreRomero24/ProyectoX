import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useSecurity } from "../../context/SecurityContext";
import { BookOpen, AlertCircle, X } from "lucide-react";

const MENSAJES_ERROR = {
  correo_no_institucional: "Solo se permiten cuentas institucionales (@unemi.edu.ec).",
  usuario_no_registrado: "Tu cuenta no está registrada. Contacta al administrador.",
  usuario_inactivo: "Tu cuenta está deshabilitada. Contacta al administrador.",
  google_auth_failed: "La autenticación con Google fue cancelada. Intenta de nuevo.",
};

export default function Login() {
  const [error, setError] = useState("");
  const { loading } = useAuth();
  const { logSecurityEvent } = useSecurity();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("error");

    if (codigo) {
      const mensaje =
        MENSAJES_ERROR[codigo] ??
        "Error al iniciar sesión. Intenta de nuevo.";

      setError(mensaje);

      // 🔥 REGISTRO DE SEGURIDAD
      logSecurityEvent("LOGIN_FAILED", {
        errorCode: codigo,
        message: mensaje,
        severity: codigo === "usuario_no_registrado" ? "CRITICAL" : "HIGH",
      });

      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [logSecurityEvent]);

  const handleGoogleLogin = () => {
    logSecurityEvent("LOGIN_ATTEMPT", {
      provider: "GOOGLE",
      severity: "LOW",
    });

    window.location.href = "/api/v1/auth/google";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon-wrap">
            <BookOpen size={26} color="#fff" />
          </div>
          <h1>EduQuery</h1>
          <p className="auth-subtitle">Plataforma de evaluaciones académicas · UNEMI</p>
        </div>

        {/* Error */}
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} className="alert-icon" />
            <span>{error}</span>
            <button className="alert-close" onClick={() => setError("")}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Google */}
        <p className="auth-hint">Ingresa con tu cuenta institucional</p>
        <button type="button" onClick={handleGoogleLogin} className="btn-google" disabled={loading}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="google-icon">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading ? "Ingresando..." : "Ingresar con Google"}
        </button>

      </div>
    </div>
  );
}