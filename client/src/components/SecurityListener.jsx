import { useEffect } from "react";
import { useSecurity } from "../context/SecurityContext";

const SecurityListener = () => {
  const { logSecurityEvent } = useSecurity();

  useEffect(() => {
    const handleKeydown = (e) => {
      const enInput = ["INPUT", "TEXTAREA"].includes(
        document.activeElement?.tagName
      );

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c" && !enInput) {
        e.preventDefault();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        logSecurityEvent("PRINT_BLOCKED", { severity: "MEDIUM" });
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        logSecurityEvent("SAVE_BLOCKED", { severity: "LOW" });
      }

      // intento de herramienta de captura
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "s") {
        logSecurityEvent("SCREENSHOT_SHORTCUT", { severity: "HIGH" });
      }
    };

    const handleKeyup = (e) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        logSecurityEvent("PRINT_SCREEN", { severity: "HIGH" });
        alert("Intento de captura detectado y registrado.");
      }
    };

    const handleBlur = () => {
      logSecurityEvent("WINDOW_BLUR", { severity: "MEDIUM" });
      document.body.style.filter = "blur(10px)";
    };

    const handleFocus = () => {
      document.body.style.filter = "none";
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
      logSecurityEvent("RIGHT_CLICK_BLOCKED", { severity: "LOW" });
    };

    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("keyup", handleKeyup);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("keyup", handleKeyup);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [logSecurityEvent]);

  return null;
};

export default SecurityListener;