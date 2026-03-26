export const formatCompletarRespuestaRevision = (detalle) => {
  const espacios = detalle?.respuesta_json?.espacios || [];
  const texto = espacios.map((esp) => `${esp.espacio_id}: ${esp.respuesta || esp.valor || "-"}`);
  return texto.length ? texto.join(" | ") : "Sin respuesta";
};

export const formatCompletarRespuestaCorrecta = (detalle) => {
  const correcta = detalle?.respuesta_correcta;
  const aceptadas = correcta?.aceptadas || [];
  const texto = aceptadas.map((a) => `${a.espacio_id}: ${(a.valores || []).join(" / ")}`);
  return texto.length ? texto.join(" | ") : "No disponible";
};
