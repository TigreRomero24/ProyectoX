import { createContext, useState, useEffect, useCallback } from "react";
import { getDeviceFingerprint } from "../services/deviceFingerprint";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("huella_oficial");
    window.location.href = "/";
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");

    if (urlToken && !token) {
      const vincularGoogle = async () => {
        setLoading(true);
        try {
          // Seteamos un usuario provisional para que las rutas protegidas
          // no nos echen mientras validamos el dispositivo
          setUser({ correo: "Cargando perfil...", rol: "ESTUDIANTE" });

          const huella = await getDeviceFingerprint();

          const response = await fetch(
            "http://localhost:3000/api/dispositivo/vincular",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${urlToken}`,
              },
              body: JSON.stringify({ huella_dispositivo: huella }),
            },
          );

          const data = await response.json();

          if (data.ok) {
            const tokenDefinitivo = data.accessToken || data.token;

            setToken(tokenDefinitivo);
            localStorage.setItem("token", tokenDefinitivo);

            setUser(data.usuario);
            localStorage.setItem("user", JSON.stringify(data.usuario));

            // 👈 NUEVO: Guardamos la huella oficial al loguearse con Google
            localStorage.setItem("huella_oficial", huella);

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname,
            );
          } else {
            setError(data.mensaje || "Límite de dispositivos alcanzado");
            setTimeout(() => logout(), 3000); // Damos 3 segundos para que el usuario lea el error
          }
        } catch (err) {
          console.error("Error en sincronización Google:", err);
          setError("Error de conexión con el servidor");
        } finally {
          setLoading(false);
        }
      };

      vincularGoogle();
    }

    // Lógica Original: Cargar usuario desde localStorage
    if (!urlToken) {
      const savedUser = localStorage.getItem("user");
      if (savedUser && token) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (e) {
          console.error("Error al cargar usuario:", e);
        }
      }
    }

    // Bloqueos de seguridad originales
    const preventScreenshot = (e) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        alert("⚠️ No se permiten capturas de pantalla");
      }
    };

    const preventCopy = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        alert("⚠️ Copiar está deshabilitado");
      }
    };

    document.addEventListener("keydown", preventScreenshot);
    document.addEventListener("keydown", preventCopy);

    return () => {
      document.removeEventListener("keydown", preventScreenshot);
      document.removeEventListener("keydown", preventCopy);
    };
  }, [token, logout]); // Dependencias optimizadas

  // --- MANTENEMOS TU LÓGICA DE LOGIN/REGISTER ---

  const login = async (correo, password) => {
    setLoading(true);
    setError("");
    try {
      const huella = await getDeviceFingerprint();
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo_institucional: correo,
          password,
          huella_dispositivo: huella,
        }),
      });
      const data = await response.json();

      if (data.ok) {
        const tkn = data.accessToken || data.token;
        setToken(tkn);
        setUser(data.usuario);
        localStorage.setItem("token", tkn);
        localStorage.setItem("user", JSON.stringify(data.usuario));
        localStorage.setItem("huella_oficial", huella);
        return { ok: true };
      }
      setError(data.mensaje || "Credenciales inválidas");
      return data;
    } catch (err) {
      setError("Error de conexión");
      return { ok: false };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
