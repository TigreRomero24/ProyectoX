import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
  const { user } = useAuth();
  const [ip, setIp] = useState(null);
  const [loadingIP, setLoadingIP] = useState(true);

  useEffect(() => {
    const getIP = async () => {
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const data = await res.json();
        setIp(data.ip);
      } catch (error) {
        console.error("Error obteniendo IP:", error);
        setIp("UNKNOWN");
      } finally {
        setLoadingIP(false);
      }
    };

    getIP();
  }, []);

  const logSecurityEvent = async (eventType, extra = {}) => {
    try {
      await fetch("/api/v1/security-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: eventType,
          timestamp: new Date().toISOString(),
          user: user?.correo_institucional || "ANONIMO",
          url: window.location.href,
          userAgent: navigator.userAgent,
          ipPublic: ip || "UNKNOWN",
          ...extra,
        }),
      });
    } catch (err) {
      console.error("Error log seguridad:", err);
    }
  };

  return (
    <SecurityContext.Provider
      value={{
        logSecurityEvent,
        ip,
        loadingIP,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => useContext(SecurityContext);