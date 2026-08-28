// Helpers compartidos para mostrar retroalimentación legible.
// El DTO viene de api.getIntento() -> respuestas_detalle, donde cada entrada
// tiene:
//   { id_opcion_elegida, respuesta_json, es_correcta_snapshot,
//     pregunta_banco: { enunciado, tipo_pregunta, estructura_json, opciones[] },
//     opcion_marcada: { id_opcion, texto }   ← solo para MULTIPLE / VF
//   }

// ── Respuesta correcta ────────────────────────────────────────────────────────
export const obtenerRespuestaCorrecta = (preguntaBanco) => {
  if (!preguntaBanco) return null;

  const tipo = preguntaBanco.tipo_pregunta;
  const estructura = preguntaBanco.estructura_json;
  const opciones = Array.isArray(preguntaBanco.opciones) ? preguntaBanco.opciones : [];

  if (tipo === "MULTIPLE" || tipo === "VERDADERO_FALSO") {
    // Usamos el flag es_correcta real (no la letra canónica de estructura_json
    // que no coincide con los id_opcion numéricos de la BD).
    const correcta = opciones.find((o) => o.es_correcta === true);
    return correcta?.texto || "Respuesta correcta no disponible";
  }

  if (!estructura?.respuesta) return null;

  if (tipo === "SELECCION_MULTIPLE") {
    const textos = opciones
      .filter((o) => o.es_correcta === true)
      .map((o) => o.texto)
      .filter(Boolean);
    return textos.length > 0 ? textos.join(", ") : "Respuestas no disponibles";
  }

  if (tipo === "ORDENAR") {
    const ordenIds = estructura.respuesta.orden_ids || [];
    const opcionesEst = Array.isArray(estructura.opciones) ? estructura.opciones : [];
    const textos = ordenIds
      .map((id, idx) => {
        const index =
          typeof id === "string" && id.length === 1 ? id.charCodeAt(0) - 65 : idx;
        const item = opcionesEst[index];
        return typeof item === "string" ? item : item?.texto;
      })
      .filter(Boolean);
    return textos.length > 0 ? textos.join(" → ") : "Orden no disponible";
  }

  if (tipo === "COMPLETAR") {
    const aceptadas = estructura.respuesta.aceptadas || [];
    const textos = aceptadas.map((a) => `[${a.valores.join(" / ")}]`);
    return textos.length > 0 ? textos.join(", ") : "Respuestas no disponibles";
  }

  return null;
};

// ── Respuesta del usuario ─────────────────────────────────────────────────────
export const obtenerRespuestaUsuario = (detalle, preguntaBanco) => {
  if (!preguntaBanco) return "Sin información";

  const tipo = preguntaBanco.tipo_pregunta;
  const opciones = Array.isArray(preguntaBanco.opciones) ? preguntaBanco.opciones : [];
  const estructura = preguntaBanco.estructura_json;

  if (tipo === "MULTIPLE" || tipo === "VERDADERO_FALSO") {
    if (!detalle.id_opcion_elegida) return "Sin responder";
    // opcion_marcada viene directo de la BD con el texto correcto
    if (detalle.opcion_marcada?.texto) return detalle.opcion_marcada.texto;
    // Fallback: buscar en el array de opciones
    const opcion = opciones.find((o) => o.id_opcion === detalle.id_opcion_elegida);
    return opcion?.texto || `Opción ${detalle.id_opcion_elegida}`;
  }

  const raw = detalle.respuesta_json;

  if (tipo === "SELECCION_MULTIPLE") {
    const ids = Array.isArray(raw) ? raw : (raw?.opciones_ids || []);
    if (ids.length === 0) return "Sin responder";
    const textos = ids.map(
      (id) => opciones.find((o) => o.id_opcion === id)?.texto || `Opción ${id}`,
    );
    return textos.join(", ");
  }

  if (tipo === "ORDENAR") {
    const ids = Array.isArray(raw) ? raw : (raw?.orden_ids || []);
    if (ids.length === 0) return "Sin responder";
    const opcionesEst = Array.isArray(estructura?.opciones) ? estructura.opciones : [];
    const textos = ids
      .map((id, idx) => {
        const index =
          typeof id === "string" && id.length === 1 ? id.charCodeAt(0) - 65 : idx;
        const item = opcionesEst[index];
        return typeof item === "string" ? item : item?.texto;
      })
      .filter(Boolean);
    return textos.length > 0 ? textos.join(" → ") : "Sin responder";
  }

  if (tipo === "COMPLETAR") {
    const espacios = Array.isArray(raw?.espacios)
      ? raw.espacios
      : Array.isArray(raw)
      ? raw
      : [];
    if (espacios.length === 0) return "Sin responder";
    const textos = espacios
      .map((e) => e?.respuesta ?? e?.valor ?? "")
      .filter((t) => String(t).trim() !== "");
    return textos.length > 0 ? textos.join(", ") : "Sin responder";
  }

  return JSON.stringify(raw);
};