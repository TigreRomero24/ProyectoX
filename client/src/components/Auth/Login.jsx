import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./Auth.css";
import "../../styles/global.css";

// Mensajes legibles para cada código de error que devuelve el backend
const MENSAJES_ERROR = {
  correo_no_institucional:
    "Acceso denegado: Solo se permiten cuentas institucionales (@unemi.edu.ec).",
  usuario_no_registrado:
    "Tu cuenta no está registrada en el sistema. Contacta al administrador.",
  usuario_inactivo: "Tu cuenta está deshabilitada. Contacta al administrador.",
  google_auth_failed:
    "La autenticación con Google fue cancelada o falló. Intenta de nuevo.",
};

export default function Login() {
  const [error, setError] = useState("");
  const { loading } = useAuth();

  // Captura cualquier ?error=codigo que devuelva el backend tras OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get("error");
    if (codigo) {
      setError(
        MENSAJES_ERROR[codigo] ?? "Error al iniciar sesión. Intenta de nuevo.",
      );
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleGoogleLogin = () => {
    window.location.href = "/api/v1/auth/google";
  };

  const handleLoginDirecto = async (rol) => {
    const correo =
      rol === "ADMINISTRADOR"
        ? "admin@unemi.edu.ec"
        : "estudiante@unemi.edu.ec";
    try {
      const res = await fetch("/api/v1/auth/login-directo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, rol }),
      });
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem("token", data.accessToken);
        localStorage.setItem("user", JSON.stringify(data.usuario));
        window.location.href = "/dashboard?token=" + data.accessToken;
      } else {
        setError(data.error || "Error al iniciar sesión.");
      }
    } catch {
      setError("Error de conexión. Verifica tu red e intenta de nuevo.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">📚</span>
          <h1>EduQuery</h1>
          <p className="auth-subtitle">Plataforma de evaluaciones académicas</p>
        </div>

        {error && (
          <div className="alert-error">
            <span className="alert-icon">⚠️</span>
            <span>{error}</span>
            <button className="alert-close" onClick={() => setError("")}>
              ✕
            </button>
          </div>
        )}

        <div className="auth-google-section">
          <p className="auth-hint">Ingresa con tu cuenta institucional</p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-google"
            disabled={loading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="google-icon"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
              <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            <span>Ingresar con Google</span>
          </button>
        </div>

        {/* Solo para pruebas — eliminar en producción
         **********************************************
         *********************************************/}
        <div className="auth-dev-panel">
          <p>Pruebas (eliminar en producción)</p>
          <div className="auth-dev-buttons">
            <button onClick={() => handleLoginDirecto("ADMINISTRADOR")}>
              Login Admin
            </button>
            <button onClick={() => handleLoginDirecto("ESTUDIANTE")}>
              Login Estudiante
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
