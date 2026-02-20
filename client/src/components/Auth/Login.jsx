import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./Auth.css";
import "../../styles/global.css";

export default function Login({ onRegisterClick }) {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, loading } = useAuth();

  //  2. Atrapamos el error que viene del Backend en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorGoogle = urlParams.get("error");

    if (errorGoogle === "correo_no_institucional") {
      setError(
        "Acceso denegado: Se requiere un correo institucional (@unemi.edu.ec).",
      );

      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorGoogle === "google_auth_failed") {
      setError("La autenticación con Google fue cancelada o falló.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const result = await login(correo, password);

    if (!result.ok) {
      setError(result.mensaje || "Error en autenticación");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/api/auth/google";
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>EduQuery Login</h1>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo Institucional"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Autenticando..." : "Ingresar"}
          </button>
        </form>

        <div style={{ margin: "20px 0", textAlign: "center" }}>
          <p style={{ margin: "10px 0", fontSize: "0.9rem", color: "#666" }}>
            O también puedes
          </p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-google"
          >
            {/* SVG Oficial de Google */}
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

        <p>
          ¿No tienes cuenta?
          <button className="link-btn" onClick={onRegisterClick}>
            Registrate aquí
          </button>
        </p>
      </div>
    </div>
  );
}
