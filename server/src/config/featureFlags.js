const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const readFlag = (key, fallback = false) => {
  const raw = String(process.env[key] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return TRUE_VALUES.has(raw);
};

export const featureFlags = Object.freeze({
  completarV2Enabled: readFlag("COMPLETAR_V2_ENABLED", true),
  completarV2DragEnabled: readFlag("COMPLETAR_V2_DRAG_ENABLED", true),
  completarV2KillSwitch: readFlag("COMPLETAR_V2_KILL_SWITCH", false),
});

export const resolveCompletarModeWithFlags = (rawMode) => {
  const normalized = String(rawMode ?? "").trim().toUpperCase();
  const requested = normalized === "ARRASTRAR" ? "ARRASTRAR" : "ESCRIBIR";

  if (!featureFlags.completarV2Enabled || featureFlags.completarV2KillSwitch) {
    return {
      requested,
      resolved: "ESCRIBIR",
      fallbackApplied: requested !== "ESCRIBIR",
      reason: "GLOBAL_FALLBACK",
    };
  }

  if (requested === "ARRASTRAR" && !featureFlags.completarV2DragEnabled) {
    return {
      requested,
      resolved: "ESCRIBIR",
      fallbackApplied: true,
      reason: "DRAG_DISABLED",
    };
  }

  return {
    requested,
    resolved: requested,
    fallbackApplied: false,
    reason: null,
  };
};
