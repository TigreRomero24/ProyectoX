import { resolveCompletarInteractionMode } from "../../../config/featureFlags.js";

export const COMPLETAR_MODO = {
  ESCRIBIR: "ESCRIBIR",
  ARRASTRAR: "ARRASTRAR",
};

export const resolveCompletarMode = (estructura = {}) => {
  return resolveCompletarInteractionMode(estructura?.modo_interaccion).resolved;
};

export const buildCompletarStateFromRespuesta = (respuestaJson = {}) => {
  const map = {};
  const espacios = Array.isArray(respuestaJson?.espacios) ? respuestaJson.espacios : [];
  for (const espacio of espacios) {
    const espacio_id = String(espacio?.espacio_id || "").trim();
    if (!espacio_id) continue;
    map[espacio_id] = {
      respuesta: String(espacio?.respuesta ?? espacio?.valor ?? ""),
      origen: String(espacio?.origen || "").trim().toUpperCase() || undefined,
    };
  }
  return map;
};

export const serializeCompletarState = (map = {}, slotIds = [], mode = COMPLETAR_MODO.ESCRIBIR) => {
  const ids = Array.isArray(slotIds) ? slotIds : [];
  return {
    espacios: ids
      .map((espacio_id) => {
        const state = map[espacio_id];
        if (!state) return null;
        return {
          espacio_id,
          respuesta: String(state.respuesta ?? ""),
          origen: state.origen || (mode === COMPLETAR_MODO.ARRASTRAR ? "DRAG" : "INPUT"),
        };
      })
      .filter(Boolean),
  };
};
