import { resolveCompletarInteractionMode } from "../../config/featureFlags.js";

export const TIPO_LABEL = {
  MULTIPLE: "Opción Múltiple",
  SELECCION_MULTIPLE: "Selección múltiple",
  ORDENAR: "Ordenar",
  VERDADERO_FALSO: "Verdadero / Falso",
  COMPLETAR: "Completar",
};

export const esLegacy = (tipo) =>
  tipo === "MULTIPLE" || tipo === "VERDADERO_FALSO";

export const getTipoLabel = (tipo) => TIPO_LABEL[tipo] || tipo;

export const normalizarPregunta = (pregunta) => {
  if (pregunta.estructura_json) {
    if (pregunta.tipo_pregunta !== "COMPLETAR") return pregunta;
    const modo = resolveCompletarInteractionMode(
      pregunta.estructura_json?.modo_interaccion,
    ).resolved;
    return {
      ...pregunta,
      estructura_json: {
        ...pregunta.estructura_json,
        modo_interaccion: modo,
        opciones_arrastrar: Array.isArray(pregunta.estructura_json?.opciones_arrastrar)
          ? pregunta.estructura_json.opciones_arrastrar
          : [],
      },
    };
  }

  if (!esLegacy(pregunta.tipo_pregunta)) return pregunta;

  const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
  const canonicas = opciones.map((o, idx) => ({
    opcion_id:
      pregunta.tipo_pregunta === "VERDADERO_FALSO"
        ? o.texto?.toLowerCase() === "falso"
          ? "F"
          : "V"
        : String.fromCharCode(65 + idx),
    texto: o.texto,
    id_opcion_legacy: o.id_opcion,
    es_correcta: o.es_correcta === true,
  }));

  const correcta = canonicas.find((o) => o.es_correcta);

  return {
    ...pregunta,
    estructura_json: {
      tipo: pregunta.tipo_pregunta,
      opciones: canonicas.map((o) => ({ opcion_id: o.opcion_id, texto: o.texto })),
      respuesta: { opcion_id: correcta?.opcion_id || null },
    },
  };
};

export const validateCompletarRuntimeConfig = (pregunta) => {
  if (!pregunta || pregunta.tipo_pregunta !== "COMPLETAR") return null;

  const estructura = pregunta.estructura_json || {};
  const slots = (estructura.texto || "").match(/\[\[([^\]]+)\]\]/g) || [];
  const espacios = Array.isArray(estructura.espacios) ? estructura.espacios : [];
  const mode = resolveCompletarInteractionMode(estructura.modo_interaccion).resolved;

  if (slots.length === 0 || espacios.length === 0 || slots.length !== espacios.length) {
    return {
      code: "COMPLETAR_RUNTIME_CONFIG_INVALIDA",
      message: "Esta pregunta tiene una configuracion invalida. Contacte a su docente.",
    };
  }

  if (mode === "ARRASTRAR") {
    const fichas = Array.isArray(estructura.opciones_arrastrar)
      ? estructura.opciones_arrastrar.filter((f) => String(f?.texto || "").trim())
      : [];

    if (fichas.length < espacios.length) {
      return {
        code: "COMPLETAR_RUNTIME_CONFIG_INVALIDA",
        message: "Esta pregunta tiene una configuracion invalida. Contacte a su docente.",
      };
    }
  }

  return null;
};

// 🔥 FIX: ahora devuelve null cuando no hay respuesta real, en lugar de un
// objeto con id_opcion/respuesta_json en undefined. Antes, ese objeto era
// truthy y pasaba el .filter(Boolean) en ExamMode, llegando al backend
// con id_opcion undefined y provocando el error
// "La opción undefined no existe en el sistema."
export const buildExamPayloadEntry = (pregunta, respuesta) => {
  if (esLegacy(pregunta.tipo_pregunta)) {
    // Sin respuesta seleccionada -> no incluir esta pregunta en el payload
    if (respuesta?.id_opcion === undefined || respuesta?.id_opcion === null) {
      return null;
    }
    return {
      id_pregunta: pregunta.id_pregunta,
      id_opcion: respuesta.id_opcion,
    };
  }

  // Sin respuesta_json (no contestada) -> no incluir esta pregunta en el payload
  if (respuesta?.respuesta_json === undefined || respuesta?.respuesta_json === null) {
    return null;
  }

  return {
    id_pregunta: pregunta.id_pregunta,
    respuesta_json: respuesta.respuesta_json,
  };
};

export const corregirRespuestaTest = (pregunta, respuesta) => {
  const tipo = pregunta.tipo_pregunta;
  const estructura = pregunta.estructura_json;
  const opciones = Array.isArray(pregunta.opciones) ? pregunta.opciones : [];
  
  if (!estructura?.respuesta) {
    return { correcto: false, puntos: 0, detalle: "Sin clave de corrección" };
  }

  if (tipo === "MULTIPLE" || tipo === "VERDADERO_FALSO") {
    const opcion_id = respuesta?.respuesta_json?.opcion_id;
    const ok = opcion_id && opcion_id === estructura.respuesta.opcion_id;
    
    // Buscar el texto de la opción correcta
    const opcionCorrecta = opciones.find((o) => o.id_opcion === estructura.respuesta.opcion_id);
    const textoCorrecta = opcionCorrecta?.texto || `Opción ${estructura.respuesta.opcion_id}`;
    
    return {
      correcto: !!ok,
      puntos: ok ? 1 : 0,
      detalle: ok ? "Correcta" : "Incorrecta",
      opcionCorrecta: estructura.respuesta.opcion_id,
      opcionElegida: opcion_id,
      textoCorrecta: textoCorrecta,
    };
  }

  if (tipo === "SELECCION_MULTIPLE") {
    const raw = respuesta?.respuesta_json;
    const userArr = Array.isArray(raw) ? raw : (raw?.opciones_ids || []);
    const user = new Set(userArr);

    // 🔥 FIX: estructura_json.respuesta.opciones_ids contiene letras canónicas
    // ("A","C") que NO coinciden con los id_opcion reales de BD (números).
    // Usamos opciones.es_correcta que sí tiene los ids reales (disponibles en
    // TEST mode porque el endpoint usa esAdmin:true).
    const correctIds = opciones
      .filter((o) => o.es_correcta === true)
      .map((o) => o.id_opcion);
    const correct = new Set(correctIds);

    // Jaccard: crédito parcial si acierta algunas pero no todas
    const inter = [...user].filter((i) => correct.has(i)).length;
    const union = new Set([...user, ...correct]).size;
    const puntos = union === 0 ? 0 : inter / union;

    // Textos de las opciones correctas (ahora sí encuentra la opción por id real)
    const textoOpcionesCorrectas = correctIds
      .map((id) => opciones.find((o) => o.id_opcion === id)?.texto)
      .filter(Boolean)
      .join(", ") || "Respuestas correctas no disponibles";

    return {
      correcto: puntos === 1,
      puntos,
      detalle: puntos === 1 ? "Correcta" : puntos > 0 ? "Parcial" : "Incorrecta",
      correcta: correctIds,
      opcionesCorrectas: correctIds,   // ids reales → estadoOpcion los encuentra
      opcionesElegidas: [...user],
      textoCorrecta: textoOpcionesCorrectas,
    };
  }

  if (tipo === "ORDENAR") {
    const raw = respuesta?.respuesta_json;
    const user = Array.isArray(raw) ? raw : (raw?.orden_ids || []);
    const correct = estructura.respuesta.orden_ids || [];
    let hits = 0;
    for (let i = 0; i < correct.length; i++) {
      if (user[i] === correct[i]) hits++;
    }
    const puntos = correct.length ? hits / correct.length : 0;
    
    // Obtener texto del orden correcto
    const textoOrdenCorrecto = correct
      .map(id => {
        const opcion = opciones.find(o => o.id_opcion === id);
        return opcion?.texto || `Opción ${id}`;
      })
      .filter(t => t)
      .join(", ") || "Orden correcto no disponible";
    
    return {
      correcto: puntos === 1,
      puntos,
      detalle: puntos === 1 ? "Correcta" : "Parcial",
      correcta: correct,
      textoCorrecta: textoOrdenCorrecto,
    };
  }
  const modo = resolveCompletarInteractionMode(estructura.modo_interaccion).resolved;

  const aceptadas = new Map(
    (estructura.respuesta.aceptadas || []).map((a) => [
      a.espacio_id,
      new Set(a.valores.map((v) => String(v).trim().toLowerCase())),
    ]),
  );

  const rawRes = respuesta?.respuesta_json;
  const espacios = Array.isArray(rawRes?.espacios)
    ? rawRes.espacios
    : (Array.isArray(rawRes) ? rawRes : []);
  const dedup = new Map();
  espacios.forEach((e) => {
    const espacio_id = String(e?.espacio_id || "").trim();
    if (!espacio_id) return;
    dedup.set(espacio_id, String(e?.respuesta ?? e?.valor ?? ""));
  });

  const fichas = new Set(
    (estructura.opciones_arrastrar || []).map((f) => String(f.texto || "").trim().toLowerCase()),
  );

  let hits = 0;
  for (const [espacioId, valueRaw] of dedup.entries()) {
    const set = aceptadas.get(espacioId);
    const value = String(valueRaw || "").trim().toLowerCase();
    if (!set) continue;
    if (modo === "ARRASTRAR" && !fichas.has(value)) continue;
    if (set.has(value)) hits++;
  }
  const puntos = aceptadas.size ? hits / aceptadas.size : 0;
  
  // Construir texto con respuestas aceptadas
  const textoRespuestasAceptadas = (estructura.respuesta.aceptadas || [])
    .map(a => `[${a.valores.join(" / ")}]`)
    .join(", ");
  
  return {
    correcto: puntos === 1,
    puntos,
    detalle: puntos === 1 ? "Correcta" : "Parcial",
    correcta: estructura.respuesta.aceptadas,
    textoCorrecta: textoRespuestasAceptadas,
  };
};