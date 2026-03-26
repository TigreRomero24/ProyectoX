const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const env =
  typeof import.meta !== "undefined" && import.meta?.env
    ? import.meta.env
    : {};

const readFlag = (key, fallback = false) => {
  const raw = String(env[key] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return TRUE_VALUES.has(raw);
};

export const featureFlags = Object.freeze({
  completarV2Enabled: readFlag("VITE_COMPLETAR_V2_ENABLED", true),
  completarV2DragEnabled: readFlag("VITE_COMPLETAR_V2_DRAG_ENABLED", true),
  completarV2KillSwitch: readFlag("VITE_COMPLETAR_V2_KILL_SWITCH", false),
});

export const resolveCompletarInteractionMode = (rawMode) => {
  const requested =
    String(rawMode ?? "").trim().toUpperCase() === "ARRASTRAR"
      ? "ARRASTRAR"
      : "ESCRIBIR";

  if (!featureFlags.completarV2Enabled || featureFlags.completarV2KillSwitch) {
    return {
      requested,
      resolved: "ESCRIBIR",
      fallbackApplied: requested !== "ESCRIBIR",
    };
  }

  if (requested === "ARRASTRAR" && !featureFlags.completarV2DragEnabled) {
    return {
      requested,
      resolved: "ESCRIBIR",
      fallbackApplied: true,
    };
  }

  return {
    requested,
    resolved: requested,
    fallbackApplied: false,
  };
};
