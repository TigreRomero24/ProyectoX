const API_URL = "/api/v1";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json();

  if (!data.ok) {
    if (response.status === 409 && data.codigo === "INTENTO_EN_PROGRESO") {
      const err = new Error("INTENTO_EN_PROGRESO");
      err.id_intento = data.id_intento;
      throw err;
    }
    if (data.error) throw new Error(data.error);
  }

  return data;
};

export const api = {
  health: () => request("/health"),

  // ── Auth ────────────────────────────────────────────────────────────────────

  loginDirecto: (correo) =>
    request("/auth/login-directo", {
      method: "POST",
      body: JSON.stringify({ correo }),
    }),

  loginGoogle: () => {
    window.location.href = "/api/v1/auth/google";
  },

  logout: () => request("/auth/logout", { method: "POST" }),

  refreshToken: () => request("/auth/refresh", { method: "POST" }),

  // ── Usuarios (Admin) ─────────────────────────────────────────────────────────

  getUsuarios: () => request("/usuarios"),

  crearUsuario: (datos) =>
    request("/usuarios", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  actualizarUsuario: (id, datos) =>
    request(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),

  cambiarEstadoUsuario: (id, activo) =>
    request(`/usuarios/${id}/estado`, {
      method: "PATCH",
      body: JSON.stringify({ activo }),
    }),

  eliminarUsuario: (id) => request(`/usuarios/${id}`, { method: "DELETE" }),

  // ── Materias ──────────────────────────────────────────────────────────────────

  getMaterias: () => request("/materias"),

  getMisMaterias: () =>
    request("/materias/mis-materias", { cache: "no-store" }),

  getMateriaById: (id) => request(`/materias/${id}`),

  crearMateria: (nombre) =>
    request("/materias", {
      method: "POST",
      body: JSON.stringify({ nombre }),
    }),

  actualizarMateria: (id, nombre) =>
    request(`/materias/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nombre }),
    }),

  eliminarMateria: (id) => request(`/materias/${id}`, { method: "DELETE" }),

  // ── Preguntas ──────────────────────────────────────────────────────────────────

  getPreguntasPorMateria: (idMateria, soloActivas = true) =>
    request(
      `/academico/preguntas/materia/${idMateria}${!soloActivas ? "?activas=false" : ""}`,
    ),

  getPreguntasTest: (idMateria) =>
    request(`/academico/preguntas/materia/${idMateria}/test`),

  getPreguntaById: (idPregunta, soloActivas = true) =>
    request(
      `/academico/preguntas/${idPregunta}${!soloActivas ? "?activas=false" : ""}`,
    ),

  crearPregunta: (datos) =>
    request("/academico/preguntas", {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  actualizarPregunta: (id, datos) =>
    request(`/academico/preguntas/${id}`, {
      method: "PUT",
      body: JSON.stringify(datos),
    }),

  eliminarPregunta: (id) =>
    request(`/academico/preguntas/${id}`, { method: "DELETE" }),

  reactivarPregunta: (id) =>
    request(`/academico/preguntas/${id}/reactivar`, { method: "PATCH" }),

  crearPreguntasBulk: (idMateria, preguntas, forzarDuplicados = false) =>
    request("/academico/preguntas/bulk", {
      method: "POST",
      body: JSON.stringify({
        id_materia: idMateria,
        preguntas,
        forzarDuplicados,
      }),
    }),

  // ── Evaluaciones ──────────────────────────────────────────────────────────────

  getConfiguracionesPorMateria: (idMateria) =>
    request(`/evaluaciones/configuraciones/materia/${idMateria}`),

  upsertConfiguracion: (idMateria, datos) =>
    request(`/evaluaciones/configuraciones/materia/${idMateria}`, {
      method: "POST",
      body: JSON.stringify(datos),
    }),

  eliminarConfiguracion: (idConfig) =>
    request(`/evaluaciones/configuraciones/${idConfig}`, { method: "DELETE" }),

  iniciarExamen: (idConfiguracion) =>
    request("/evaluaciones/iniciar", {
      method: "POST",
      body: JSON.stringify({ id_configuracion: idConfiguracion }),
    }),

  enviarExamen: (idIntento, respuestas) =>
    request(`/evaluaciones/intentos/${idIntento}/enviar`, {
      method: "PATCH",
      body: JSON.stringify({ respuestas }),
    }),

  getIntento: (idIntento) => request(`/evaluaciones/intentos/${idIntento}`),

  retomarExamen: (idIntento) => request(`/evaluaciones/retomar/${idIntento}`),

  getHistorial: () => request("/evaluaciones/historial"),

  // ── Inscripciones ────────────────────────────────────────────────────────────
  getInscripciones: (busqueda = "") =>
    request(
      `/inscripciones${busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : ""}`,
    ),

  getResumenInscripciones: () => request("/inscripciones/resumen"),

  getEstudiantesParaInscripcion: () => request("/inscripciones/estudiantes"),

  getMateriasParaInscripcion: () => request("/inscripciones/materias"),

  crearInscripcion: (id_usuario, id_materia, modo_evaluacion) =>
    request("/inscripciones", {
      method: "POST",
      body: JSON.stringify({ id_usuario, id_materia, modo_evaluacion }),
    }),

  cambiarEstadoInscripcion: (id_usuario, id_materia, modo_evaluacion, activo) =>
    request("/inscripciones/estado", {
      method: "PATCH",
      body: JSON.stringify({ id_usuario, id_materia, modo_evaluacion, activo }),
    }),

  eliminarInscripcion: (id_usuario, id_materia, modo_evaluacion) =>
    request("/inscripciones", {
      method: "DELETE",
      body: JSON.stringify({ id_usuario, id_materia, modo_evaluacion }),
    }),
};
