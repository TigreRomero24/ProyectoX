import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
} from "react";
import { api } from "../services/api";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const decodeJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const TOKEN_KEY = "token";
const USER_KEY = "user";

const persistirSesion = (token, usuario) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
};

const limpiarSesion = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      limpiarSesion();
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error("[AuthContext] Error al cerrar sesión:", err.message);
    } finally {
      setUser(null);
      setToken(null);
      limpiarSesion();
      window.location.replace("/");
    }
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    const urlError = urlParams.get("error");

    if (urlError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (!urlToken) return;

    const sincronizarGoogle = async () => {
      setLoading(true);
      setError("");

      try {
        const payload = decodeJWT(urlToken);

        if (!payload?.id) {
          throw new Error("Token de autenticación inválido.");
        }

        const usuarioData = {
          id: payload.id,
          rol: payload.rol ?? "ESTUDIANTE",
        };

        persistirSesion(urlToken, usuarioData);
        setToken(urlToken);
        setUser(usuarioData);

        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      } catch (err) {
        console.error(
          "[AuthContext] Error en sincronización Google:",
          err.message,
        );
        setError("Error al procesar la autenticación. Intente nuevamente.");
        limpiarSesion();
      } finally {
        setLoading(false);
      }
    };

    sincronizarGoogle();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const dashToken = urlParams.get("token");
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (token) return;

    if (storedToken && !token) {
      const storedUser = (() => {
        try {
          const u = localStorage.getItem(USER_KEY);
          return u ? JSON.parse(u) : null;
        } catch {
          return null;
        }
      })();

      if (storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    }

    if (dashToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    const renovarSiExpira = async () => {
      const payload = decodeJWT(token);
      if (!payload?.exp) return;

      const ahora = Math.floor(Date.now() / 1000);
      const segundosRestantes = payload.exp - ahora;

      if (segundosRestantes < 300) {
        try {
          const data = await api.refreshToken();
          const nuevoPayload = decodeJWT(data.accessToken);
          const usuarioData = {
            id: nuevoPayload.id,
            rol: nuevoPayload.rol ?? user?.rol,
          };
          persistirSesion(data.accessToken, usuarioData);
          setToken(data.accessToken);
          setUser(usuarioData);
        } catch {
          logout();
        }
      }
    };

    renovarSiExpira();
    const intervalo = setInterval(renovarSiExpira, 4 * 60 * 1000);
    return () => clearInterval(intervalo);
  }, [token, logout, user?.rol]);

  // ── Seguridad global ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeydown = (e) => {
      const enInput = ["INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName,
      );

      // Ctrl+C bloqueado fuera de inputs — formularios propios siguen funcionando
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !enInput) {
        e.preventDefault();
      }
      // Ctrl+P — imprimir bloqueado
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        alert("La impresión está deshabilitada por políticas de seguridad.");
      }
      // Ctrl+S — guardar página bloqueado
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
      }
    };

    const handleKeyup = async (e) => {
      if (e.key === "PrintScreen") {
        try {
          await navigator.clipboard.writeText(
            "Captura deshabilitada - Derechos reservados EduQuery",
          );
        } catch {}
        alert("Las capturas de pantalla están prohibidas en esta plataforma.");
      }
    };

    const preventContextMenu = (e) => e.preventDefault();

    const handleWindowBlur = () => {
      document.body.style.filter = "blur(12px)";
      document.body.style.transition = "filter 0.1s ease";
    };

    const handleWindowFocus = () => {
      document.body.style.filter = "none";
    };

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);
    document.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
      document.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      document.body.style.userSelect = "auto";
      document.body.style.webkitUserSelect = "auto";
      document.body.style.filter = "none";
    };
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────────
  const loginConGoogle = useCallback(() => {
    setError("");
    api.loginGoogle();
  }, []);

  const login = loginConGoogle;
  const register = loginConGoogle;

  // ── Valor expuesto ────────────────────────────────────────────────────────────
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        setError,
        login,
        register,
        loginConGoogle,
        logout,
        isAdmin: user?.rol === "ADMINISTRADOR",
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
