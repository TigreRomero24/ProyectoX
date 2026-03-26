const API_URL = "/api/v1";

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

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
    const frontend = encodeURIComponent(window.location.origin);
    window.location.href = `/api/v1/auth/google?frontend=${frontend}`;
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
      body: JSON.stringify({ estado: !!activo }),
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

  subirImagenMateria: (id, archivo) => {
    const formData = new FormData();
    formData.append("imagen", archivo);

    return request(`/materias/${id}/imagen`, {
      method: "POST",
      body: formData,
    });
  },

  eliminarImagenMateria: (id) =>
    request(`/materias/${id}/imagen`, { method: "DELETE" }),

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

  // Compat legacy: históricamente DELETE desactiva.
  eliminarPregunta: (id) =>
    request(`/academico/preguntas/${id}`, { method: "DELETE" }),

  desactivarPregunta: (id) =>
    request(`/academico/preguntas/${id}/desactivar`, { method: "PATCH" }),

  activarPregunta: (id) =>
    request(`/academico/preguntas/${id}/activar`, { method: "PATCH" }),

  // Compat legacy: endpoint anterior /reactivar
  reactivarPregunta: (id) =>
    request(`/academico/preguntas/${id}/reactivar`, { method: "PATCH" }),

  eliminarPreguntaFisica: (id) =>
    request(`/academico/preguntas/${id}/fisica`, { method: "DELETE" }),

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

  iniciarExamen: (idConfiguracion, options = {}) =>
    request("/evaluaciones/iniciar", {
      method: "POST",
      body: JSON.stringify({
        id_configuracion: idConfiguracion,
        ...(options.reiniciar ? { reiniciar: true } : {}),
      }),
    }),

  enviarExamen: (idIntento, respuestas) =>
    request(`/evaluaciones/intentos/${idIntento}/enviar`, {
      method: "PATCH",
      body: JSON.stringify({ respuestas }),
    }),

  guardarProgresoExamen: (idIntento, progreso) =>
    request(`/evaluaciones/intentos/${idIntento}/progreso`, {
      method: "PATCH",
      body: JSON.stringify({ progreso }),
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

  crearInscripcion: (id_usuario, id_materia, modo_evaluacion) => {
    const payload = { id_usuario, id_materia };
    if (modo_evaluacion !== undefined && modo_evaluacion !== null) {
      payload.modo_evaluacion = modo_evaluacion;
    }

    return request("/inscripciones", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

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
