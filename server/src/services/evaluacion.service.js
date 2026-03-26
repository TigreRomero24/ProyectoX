import { sequelize } from "../config/database.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { Materia } from "../models/academico.models/materia.js";
import { ConfiguracionExamen } from "../models/evaluacion.models/configuracionExamen.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";
import { featureFlags, resolveCompletarModeWithFlags } from "../config/featureFlags.js";

const PREGUNTAS_MODO_TEST = 10;
const TOLERANCIA_TIEMPO_MIN = 2;
const TIPOS_LEGACY = ["MULTIPLE", "VERDADERO_FALSO"];
const COMPLETAR_MODOS = ["ESCRIBIR", "ARRASTRAR"];
const COMPLETAR_ORIGENES = ["INPUT", "DRAG"];
const COMPLETAR_ID_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

const textoNormalizado = (v) => String(v ?? "").trim().toLowerCase();

const logCompletar = (evento, payload) => {
  console.info(`[${evento}]`, payload);
};

export class EvaluacionService {
  static #mezclarYCortar(arreglo, cantidad) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia.slice(0, cantidad);
  }

  static #calcularCantidadPreguntas(modo, totalDisponibles) {
    if (modo === "TEST") {
      return Math.min(PREGUNTAS_MODO_TEST, totalDisponibles);
    }
    return totalDisponibles;
  }

  static #esTipoLegacy(tipo) {
    return TIPOS_LEGACY.includes(tipo);
  }

  static #sinRespuesta(estructura_json) {
    if (!estructura_json) return null;
    const copia = JSON.parse(JSON.stringify(estructura_json));
    delete copia.respuesta;
    return copia;
  }

  static #snapshotDesdeLegacy(pregunta, opciones) {
    const opcionesLegacy = opciones[pregunta.id_pregunta] ?? [];
    const canonicas = opcionesLegacy.map((op, idx) => ({
      opcion_id:
        pregunta.tipo_pregunta === "VERDADERO_FALSO"
          ? op.texto?.toLowerCase() === "falso"
            ? "F"
            : "V"
          : String.fromCharCode(65 + idx),
      texto: op.texto,
      id_opcion_legacy: op.id_opcion,
      es_correcta: op.es_correcta === true,
    }));

    const correcta = canonicas.find((o) => o.es_correcta);
    const estructura_json = {
      tipo: pregunta.tipo_pregunta,
      opciones: canonicas.map((o) => ({ opcion_id: o.opcion_id, texto: o.texto })),
      respuesta: { opcion_id: correcta?.opcion_id ?? null },
    };

    return {
      id_pregunta: pregunta.id_pregunta,
      enunciado: pregunta.enunciado,
      url_imagen: pregunta.url_imagen ?? null,
      tipo_pregunta: pregunta.tipo_pregunta,
      estructura_json,
      opciones_legacy: opcionesLegacy,
    };
  }

  static #snapshotDesdePregunta(pregunta, opcionesLegacyMap) {
    const base = {
      id_pregunta: pregunta.id_pregunta,
      enunciado: pregunta.enunciado,
      url_imagen: pregunta.url_imagen ?? null,
      tipo_pregunta: pregunta.tipo_pregunta,
      estructura_json: pregunta.estructura_json ?? null,
      opciones_legacy: [],
    };

    if (EvaluacionService.#esTipoLegacy(pregunta.tipo_pregunta)) {
      return EvaluacionService.#snapshotDesdeLegacy(pregunta, opcionesLegacyMap);
    }

    return base;
  }

  static #preguntaClienteDesdeSnapshot(snapshot) {
    const payload = {
      id_pregunta: snapshot.id_pregunta,
      enunciado: snapshot.enunciado,
      url_imagen: snapshot.url_imagen ?? null,
      tipo_pregunta: snapshot.tipo_pregunta,
      estructura_json: EvaluacionService.#sinRespuesta(snapshot.estructura_json),
      opciones: [],
    };

    if (EvaluacionService.#esTipoLegacy(snapshot.tipo_pregunta)) {
      payload.opciones = (snapshot.opciones_legacy ?? []).map((o) => ({
        id_opcion: o.id_opcion,
        texto: o.texto,
      }));
    }

    return payload;
  }

  static #respuestaCorrectaDesdeSnapshot(snapshotPregunta) {
    if (!snapshotPregunta?.estructura_json?.respuesta) return null;

    if (EvaluacionService.#esTipoLegacy(snapshotPregunta.tipo_pregunta)) {
      const opcionId = snapshotPregunta.estructura_json.respuesta.opcion_id;
      const opcion = (snapshotPregunta.estructura_json.opciones ?? []).find(
        (o) => o.opcion_id === opcionId,
      );

      return {
        opcion_id: opcionId ?? null,
        texto: opcion?.texto ?? null,
      };
    }

    return snapshotPregunta.estructura_json.respuesta;
  }

  static #buildDetalleDTO(detalle, snapshotPregunta) {
    return {
      id_pregunta: detalle.id_pregunta,
      id_opcion_elegida: detalle.id_opcion_elegida,
      respuesta_json: detalle.respuesta_json ?? null,
      es_correcta: detalle.es_correcta_snapshot,
      puntos_obtenidos: detalle.puntos_obtenidos,
      respuesta_correcta:
        EvaluacionService.#respuestaCorrectaDesdeSnapshot(snapshotPregunta),
    };
  }

  static #calcularTiempoRestanteSegundos(intento, configuracion) {
    if (!configuracion?.tiempo_limite_min) return null;

    const fechaInicioMs = new Date(intento.fecha_inicio).getTime();
    const limiteMs = configuracion.tiempo_limite_min * 60 * 1000;
    const transcurridoMs = Date.now() - fechaInicioMs;
    const restanteMs = limiteMs - transcurridoMs;

    return Math.max(Math.floor(restanteMs / 1000), 0);
  }

  static #normalizarProgresoGuardado(intento, totalPreguntas) {
    const respuestasRaw =
      intento?.progreso_respuestas_json &&
      typeof intento.progreso_respuestas_json === "object"
        ? intento.progreso_respuestas_json
        : {};

    const respuestas = {};
    for (const [key, value] of Object.entries(respuestasRaw)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id <= 0) continue;
      if (!value || typeof value !== "object") continue;
      respuestas[id] = value;
    }

    const indiceRaw = Number(intento?.progreso_indice_actual);
    const indiceActual = Number.isInteger(indiceRaw)
      ? Math.min(Math.max(indiceRaw, 0), Math.max(totalPreguntas - 1, 0))
      : 0;

    return {
      respuestas,
      indice_actual: indiceActual,
      ultima_actividad_at: intento?.ultima_actividad_at ?? null,
    };
  }

  static #buildIntentoRendicionDTO({
    intento,
    configuracion,
    snapshot,
    intentosFinalizados,
    intentoReutilizado = false,
  }) {
    const limiteIntentos =
      configuracion.modo === "TEST" ? null : configuracion.intentos_permitidos;
    const tieneLimiteIntentos =
      Number.isInteger(limiteIntentos) && limiteIntentos >= 1;

    return {
      id_intento: intento.id_intento,
      configuracion: {
        modo: configuracion.modo,
        tiempo_limite_min: configuracion.tiempo_limite_min,
        intentos_permitidos: limiteIntentos,
        intentos_realizados: intentosFinalizados,
        intentos_restantes: tieneLimiteIntentos
          ? Math.max(limiteIntentos - intentosFinalizados - 1, 0)
          : null,
      },
      total_preguntas: snapshot.length,
      preguntas: snapshot.map(EvaluacionService.#preguntaClienteDesdeSnapshot),
      progreso: EvaluacionService.#normalizarProgresoGuardado(intento, snapshot.length),
      tiempo_restante_seg: EvaluacionService.#calcularTiempoRestanteSegundos(
        intento,
        configuracion,
      ),
      intento_reutilizado: intentoReutilizado,
    };
  }

  static #normalizarRespuestaEntrada(respuesta, tipo_pregunta) {
    const id_pregunta = Number(respuesta.id_pregunta);
    if (!Number.isInteger(id_pregunta) || id_pregunta <= 0) {
      throw new Error("VALIDACION: id_pregunta inválido en respuestas.");
    }

    const id_opcion =
      respuesta.id_opcion !== undefined && respuesta.id_opcion !== null
        ? Number(respuesta.id_opcion)
        : null;

    const respuesta_json =
      respuesta.respuesta_json && typeof respuesta.respuesta_json === "object"
        ? respuesta.respuesta_json
        : null;

    if (EvaluacionService.#esTipoLegacy(tipo_pregunta)) {
      if (!Number.isInteger(id_opcion) || id_opcion <= 0) {
        throw new Error(
          `VALIDACION: La pregunta ${id_pregunta} requiere id_opcion (legacy).`,
        );
      }
      return { id_pregunta, id_opcion, respuesta_json: null };
    }

    if (!respuesta_json) {
      throw new Error(
        `VALIDACION: La pregunta ${id_pregunta} requiere respuesta_json.`,
      );
    }

    return {
      id_pregunta,
      id_opcion: null,
      respuesta_json,
    };
  }

  static #calcularPuntajeLegacy(snapshotPregunta, respuestaNorm) {
    const opcion = (snapshotPregunta.opciones_legacy ?? []).find(
      (o) => o.id_opcion === respuestaNorm.id_opcion,
    );

    if (!opcion) {
      throw new Error(
        `VALIDACION: La opción ${respuestaNorm.id_opcion} no corresponde a la pregunta ${snapshotPregunta.id_pregunta}.`,
      );
    }

    const esCorrecta = opcion.es_correcta === true;
    return {
      es_correcta_snapshot: esCorrecta,
      puntos_obtenidos: esCorrecta ? 1 : 0,
      id_opcion_elegida: opcion.id_opcion,
      respuesta_json: null,
    };
  }

  static #calcularPuntajeSeleccionMultiple(estructura, respuesta) {
    const idsCorrectos = new Set(estructura.respuesta.opciones_ids);
    const idsUsuario = Array.isArray(respuesta?.opciones_ids)
      ? respuesta.opciones_ids.map((id) => String(id))
      : null;

    if (!idsUsuario || idsUsuario.length === 0) {
      throw new Error(
        "VALIDACION: SELECCION_MULTIPLE requiere respuesta_json.opciones_ids.",
      );
    }

    const setUsuario = new Set(idsUsuario);
    if (setUsuario.size !== idsUsuario.length) {
      throw new Error(
        "VALIDACION: respuesta_json.opciones_ids contiene duplicados.",
      );
    }

    const idsOpciones = new Set(estructura.opciones.map((o) => o.opcion_id));
    for (const id of setUsuario) {
      if (!idsOpciones.has(id)) {
        throw new Error(
          "VALIDACION: respuesta_json.opciones_ids contiene opciones inválidas.",
        );
      }
    }

    const interseccion = [...setUsuario].filter((id) => idsCorrectos.has(id)).length;
    const union = new Set([...setUsuario, ...idsCorrectos]).size;
    const puntos = union === 0 ? 0 : interseccion / union;
    return {
      es_correcta_snapshot: puntos === 1,
      puntos_obtenidos: Number(puntos.toFixed(4)),
      respuesta_json: { opciones_ids: [...setUsuario] },
    };
  }

  static #calcularPuntajeOrdenar(estructura, respuesta) {
    const ordenUsuario = Array.isArray(respuesta?.orden_ids)
      ? respuesta.orden_ids.map((id) => String(id))
      : null;
    const ordenCorrecto = estructura.respuesta.orden_ids;

    if (!ordenUsuario || ordenUsuario.length !== ordenCorrecto.length) {
      throw new Error(
        "VALIDACION: ORDENAR requiere respuesta_json.orden_ids con longitud exacta.",
      );
    }

    let aciertos = 0;
    for (let i = 0; i < ordenCorrecto.length; i++) {
      if (ordenUsuario[i] === ordenCorrecto[i]) aciertos++;
    }

    const puntos = aciertos / ordenCorrecto.length;
    return {
      es_correcta_snapshot: puntos === 1,
      puntos_obtenidos: Number(puntos.toFixed(4)),
      respuesta_json: { orden_ids: ordenUsuario },
    };
  }

  static #calcularPuntajeRelacionar(estructura, respuesta) {
    const paresUsuario = Array.isArray(respuesta?.pares) ? respuesta.pares : null;
    if (!paresUsuario || paresUsuario.length === 0) {
      throw new Error("VALIDACION: RELACIONAR requiere respuesta_json.pares.");
    }

    const correctos = new Map(
      estructura.respuesta.pares.map((p) => [p.izquierda_id, p.derecha_id]),
    );

    let aciertos = 0;
    for (const par of paresUsuario) {
      if (!par || !par.izquierda_id || !par.derecha_id) {
        throw new Error("VALIDACION: respuesta_json.pares contiene pares inválidos.");
      }
      if (correctos.get(String(par.izquierda_id)) === String(par.derecha_id)) {
        aciertos++;
      }
    }

    const puntos = Math.min(aciertos, correctos.size) / correctos.size;
    return {
      es_correcta_snapshot: puntos === 1,
      puntos_obtenidos: Number(puntos.toFixed(4)),
      respuesta_json: {
        pares: paresUsuario.map((p) => ({
          izquierda_id: String(p.izquierda_id),
          derecha_id: String(p.derecha_id),
        })),
      },
    };
  }

  static #resolverModoCompletar(estructura, preguntaId, intentoId) {
    const raw = String(estructura?.modo_interaccion ?? "").trim().toUpperCase();
    if (!raw || !COMPLETAR_MODOS.includes(raw)) {
      if (raw && !COMPLETAR_MODOS.includes(raw)) {
        throw new Error(
          "VALIDACION: COMPLETAR_INVALID_MODO: Modo de interaccion invalido. Use ESCRIBIR o ARRASTRAR.",
        );
      }
      logCompletar("completar.legacy.fallback_mode", {
        pregunta_id: preguntaId,
        intento_id: intentoId,
        modo_recibido: estructura?.modo_interaccion ?? null,
        modo_resuelto: "ESCRIBIR",
        actor: "runtime",
      });
      return "ESCRIBIR";
    }

    const resolution = resolveCompletarModeWithFlags(raw);
    if (resolution.fallbackApplied) {
      logCompletar("completar.legacy.fallback_mode", {
        pregunta_id: preguntaId,
        intento_id: intentoId,
        modo_recibido: raw,
        modo_resuelto: "ESCRIBIR",
        actor: "runtime",
        motivo: resolution.reason,
      });
    }

    return resolution.resolved;
  }

  static #aceptadasCompletar(estructura) {
    if (Array.isArray(estructura?.respuesta?.aceptadas)) {
      return estructura.respuesta.aceptadas;
    }

    if (Array.isArray(estructura?.espacios)) {
      return estructura.espacios.map((esp) => ({
        espacio_id: esp.espacio_id,
        valores: Array.isArray(esp.respuestas_aceptadas) ? esp.respuestas_aceptadas : [],
      }));
    }

    return [];
  }

  static #normalizarEspaciosCompletar(espaciosUsuario) {
    const dedup = new Map();
    let duplicados = 0;

    for (let idx = 0; idx < espaciosUsuario.length; idx++) {
      const item = espaciosUsuario[idx];
      const espacio_id = String(item?.espacio_id ?? "").trim();
      if (!espacio_id || !COMPLETAR_ID_REGEX.test(espacio_id)) continue;

      const respuesta = String(item?.respuesta ?? item?.valor ?? "").trim();
      const origenRaw = String(item?.origen ?? "").trim().toUpperCase();
      const origen = COMPLETAR_ORIGENES.includes(origenRaw) ? origenRaw : null;

      if (dedup.has(espacio_id)) duplicados++;
      dedup.set(espacio_id, { espacio_id, respuesta, origen, idx_original: idx });
    }

    return {
      items: [...dedup.values()],
      duplicados,
    };
  }

  static #calcularPuntajeCompletar(estructura, respuesta, contexto = {}) {
    const espaciosUsuario = Array.isArray(respuesta?.espacios)
      ? respuesta.espacios
      : null;
    if (!espaciosUsuario) {
      throw new Error(
        "VALIDACION: COMPLETAR_RESPUESTA_MALFORMADA: La respuesta enviada no tiene el formato esperado.",
      );
    }

    const modo = EvaluacionService.#resolverModoCompletar(
      estructura,
      contexto.pregunta_id,
      contexto.intento_id,
    );

    const aceptadas = new Map(
      EvaluacionService.#aceptadasCompletar(estructura).map((a) => [
        a.espacio_id,
        new Set(a.valores.map((v) => textoNormalizado(v))),
      ]),
    );

    const espacioDefinidos = new Map(
      (estructura.espacios || []).map((esp, idx) => [
        esp.espacio_id,
        {
          espacio_id: esp.espacio_id,
          puntaje:
            Number.isFinite(Number(esp.puntaje)) && Number(esp.puntaje) > 0
              ? Number(esp.puntaje)
              : 1,
          posicion:
            Number.isInteger(Number(esp.posicion)) && Number(esp.posicion) > 0
              ? Number(esp.posicion)
              : idx + 1,
        },
      ]),
    );

    const { items, duplicados } = EvaluacionService.#normalizarEspaciosCompletar(
      espaciosUsuario,
    );

    if (duplicados > 0) {
      logCompletar("completar.scoring.dedup_applied", {
        pregunta_id: contexto.pregunta_id ?? null,
        intento_id: contexto.intento_id ?? null,
        duplicados_detectados: duplicados,
        espacios_unicos: items.length,
      });
    }

    const fichasPermitidas =
      modo === "ARRASTRAR"
        ? new Set(
            (Array.isArray(estructura.opciones_arrastrar)
              ? estructura.opciones_arrastrar
              : []
            ).map((f) => textoNormalizado(f.texto)),
          )
        : null;

    if (modo === "ARRASTRAR" && fichasPermitidas && fichasPermitidas.size === 0) {
      throw new Error(
        "VALIDACION: COMPLETAR_RUNTIME_CONFIG_INVALIDA: Esta pregunta tiene una configuracion invalida. Contacte a su docente.",
      );
    }

    const canonicos = [];
    for (const item of items) {
      if (!aceptadas.has(item.espacio_id)) {
        logCompletar("completar.scoring.unknown_space", {
          pregunta_id: contexto.pregunta_id ?? null,
          intento_id: contexto.intento_id ?? null,
          espacio_id: item.espacio_id,
          modo_interaccion: modo,
        });
        continue;
      }
      canonicos.push({
        espacio_id: item.espacio_id,
        respuesta: item.respuesta,
        origen: item.origen || (modo === "ARRASTRAR" ? "DRAG" : "INPUT"),
      });
    }

    const canonicosMap = new Map(canonicos.map((item) => [item.espacio_id, item]));

    const definidosOrdenados = [...espacioDefinidos.values()].sort(
      (a, b) => a.posicion - b.posicion,
    );

    let puntajeObtenido = 0;
    const puntajeTotal = definidosOrdenados.reduce(
      (acc, esp) => acc + (esp.puntaje || 1),
      0,
    );

    for (const esp of definidosOrdenados) {
      const entrada = canonicosMap.get(esp.espacio_id);
      if (!entrada) continue;

      const valorNormalizado = textoNormalizado(entrada.respuesta);
      if (modo === "ARRASTRAR" && fichasPermitidas && !fichasPermitidas.has(valorNormalizado)) {
        continue;
      }

      if (aceptadas.get(esp.espacio_id)?.has(valorNormalizado)) {
        puntajeObtenido += esp.puntaje || 1;
      }
    }

    const puntos = puntajeTotal === 0 ? 0 : puntajeObtenido / puntajeTotal;
    return {
      es_correcta_snapshot: puntos === 1,
      puntos_obtenidos: Number(puntos.toFixed(4)),
      respuesta_json: {
        espacios: definidosOrdenados
          .map((esp) => canonicosMap.get(esp.espacio_id))
          .filter(Boolean)
          .map((e) => ({
            espacio_id: e.espacio_id,
            respuesta: e.respuesta,
            origen: e.origen,
          })),
      },
    };
  }

  static #calcularPuntajeNoLegacy(snapshotPregunta, respuestaNorm, contexto = {}) {
    const estructura = snapshotPregunta.estructura_json;
    if (!estructura || !estructura.respuesta) {
      throw new Error(
        `ESTADO_INVALIDO: La pregunta ${snapshotPregunta.id_pregunta} no tiene estructura de corrección.`,
      );
    }

    if (snapshotPregunta.tipo_pregunta === "SELECCION_MULTIPLE") {
      return EvaluacionService.#calcularPuntajeSeleccionMultiple(
        estructura,
        respuestaNorm.respuesta_json,
      );
    }

    if (snapshotPregunta.tipo_pregunta === "ORDENAR") {
      return EvaluacionService.#calcularPuntajeOrdenar(
        estructura,
        respuestaNorm.respuesta_json,
      );
    }

    if (snapshotPregunta.tipo_pregunta === "RELACIONAR") {
      return EvaluacionService.#calcularPuntajeRelacionar(
        estructura,
        respuestaNorm.respuesta_json,
      );
    }

    if (snapshotPregunta.tipo_pregunta === "COMPLETAR") {
      return EvaluacionService.#calcularPuntajeCompletar(
        estructura,
        respuestaNorm.respuesta_json,
        contexto,
      );
    }

    throw new Error(
      `VALIDACION: Tipo de pregunta no soportado en rendición: ${snapshotPregunta.tipo_pregunta}.`,
    );
  }

  static async #snapshotFallbackLegacy(configuracion, transaction) {
    const preguntas = await BancoPregunta.findAll({
      where: { id_materia: configuracion.id_materia, activo: true },
      attributes: [
        "id_pregunta",
        "enunciado",
        "url_imagen",
        "tipo_pregunta",
        "estructura_json",
      ],
      transaction,
    });

    const ids = preguntas.map((p) => p.id_pregunta);
    const opciones = await OpcionRespuesta.findAll({
      where: { id_pregunta: ids },
      attributes: ["id_opcion", "id_pregunta", "texto", "es_correcta"],
      transaction,
    });

    const opcionesPorPregunta = opciones.reduce((acc, opcion) => {
      const raw = opcion.get({ plain: true });
      if (!acc[raw.id_pregunta]) acc[raw.id_pregunta] = [];
      acc[raw.id_pregunta].push(raw);
      return acc;
    }, {});

    return preguntas.map((p) =>
      EvaluacionService.#snapshotDesdePregunta(
        p.get({ plain: true }),
        opcionesPorPregunta,
      ),
    );
  }

  static async iniciarExamen(id_usuario, id_configuracion, reiniciar = false) {
    const configuracion = await ConfiguracionExamen.findByPk(id_configuracion);
    if (!configuracion) {
      throw new Error("NO_ENCONTRADO: Configuración de examen no encontrada.");
    }

    const inscripcion = await Inscripcion.findOne({
      where: {
        id_usuario,
        id_materia: configuracion.id_materia,
        modo_evaluacion: configuracion.modo,
        activo: true,
      },
      attributes: ["id_usuario"],
    });
    if (!inscripcion) {
      throw new Error(
        "RESTRICCION: No está inscrito en esta materia con el modo requerido, o la inscripción está desactivada.",
      );
    }

    const intentosFinalizados = await Intento.count({
      where: {
        id_usuario,
        id_config: id_configuracion,
        estado: "FINALIZADO",
      },
    });
    const limiteIntentos =
      configuracion.modo === "TEST" ? null : configuracion.intentos_permitidos;
    const tieneLimiteIntentos =
      Number.isInteger(limiteIntentos) && limiteIntentos >= 1;

    if (tieneLimiteIntentos && intentosFinalizados >= limiteIntentos) {
      throw new Error(
        `RESTRICCION: Ha alcanzado el límite de ${limiteIntentos} intento(s) permitido(s).`,
      );
    }

    const t = await sequelize.transaction();

    try {
      const intentoEnProgreso = await Intento.findOne({
        where: { id_usuario, id_config: id_configuracion, estado: "EN_PROGRESO" },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (intentoEnProgreso) {
        if (reiniciar) {
          await intentoEnProgreso.destroy({ transaction: t });
        } else {
          const snapshot = Array.isArray(intentoEnProgreso.preguntas_snapshot_json)
            ? intentoEnProgreso.preguntas_snapshot_json
            : await EvaluacionService.#snapshotFallbackLegacy(configuracion, t);

          await t.commit();
          return EvaluacionService.#buildIntentoRendicionDTO({
            intento: intentoEnProgreso,
            configuracion,
            snapshot,
            intentosFinalizados,
            intentoReutilizado: true,
          });
        }
      }

      const preguntasDisponibles = await BancoPregunta.findAll({
        where: { id_materia: configuracion.id_materia, activo: true },
        attributes: [
          "id_pregunta",
          "enunciado",
          "url_imagen",
          "tipo_pregunta",
          "estructura_json",
        ],
        transaction: t,
      });

      if (preguntasDisponibles.length === 0) {
        throw new Error(
          "ESTADO_INVALIDO: No hay preguntas activas disponibles para este examen.",
        );
      }

      const cantidad = EvaluacionService.#calcularCantidadPreguntas(
        configuracion.modo,
        preguntasDisponibles.length,
      );

      const preguntasSeleccionadas = EvaluacionService.#mezclarYCortar(
        preguntasDisponibles,
        cantidad,
      );

      const idsPreguntasLegacy = preguntasSeleccionadas
        .map((p) => p.get({ plain: true }))
        .filter((p) => EvaluacionService.#esTipoLegacy(p.tipo_pregunta))
        .map((p) => p.id_pregunta);

      const opcionesLegacy = await OpcionRespuesta.findAll({
        where: { id_pregunta: idsPreguntasLegacy },
        attributes: ["id_opcion", "id_pregunta", "texto", "es_correcta"],
        transaction: t,
      });

      const opcionesPorPregunta = opcionesLegacy.reduce((acc, opcion) => {
        const raw = opcion.get({ plain: true });
        if (!acc[raw.id_pregunta]) acc[raw.id_pregunta] = [];
        acc[raw.id_pregunta].push(raw);
        return acc;
      }, {});

      const snapshot = preguntasSeleccionadas.map((p) =>
        EvaluacionService.#snapshotDesdePregunta(
          p.get({ plain: true }),
          opcionesPorPregunta,
        ),
      );

      const intento = await Intento.create(
        {
          id_usuario,
          id_config: id_configuracion,
          fecha_inicio: new Date(),
          estado: "EN_PROGRESO",
          preguntas_snapshot_json: snapshot,
          progreso_respuestas_json: {},
          progreso_indice_actual: 0,
          ultima_actividad_at: new Date(),
        },
        { transaction: t },
      );

      await t.commit();

      return EvaluacionService.#buildIntentoRendicionDTO({
        intento,
        configuracion,
        snapshot,
        intentosFinalizados,
        intentoReutilizado: false,
      });
    } catch (error) {
      await t.rollback();

      if (
        error?.name === "SequelizeUniqueConstraintError" ||
        error?.original?.constraint === "uq_intento_en_progreso_usuario_config"
      ) {
        const intentoEnProgreso = await Intento.findOne({
          where: { id_usuario, id_config: id_configuracion, estado: "EN_PROGRESO" },
        });

        if (intentoEnProgreso) {
          const snapshot = Array.isArray(intentoEnProgreso.preguntas_snapshot_json)
            ? intentoEnProgreso.preguntas_snapshot_json
            : await EvaluacionService.#snapshotFallbackLegacy(configuracion, null);

          return EvaluacionService.#buildIntentoRendicionDTO({
            intento: intentoEnProgreso,
            configuracion,
            snapshot,
            intentosFinalizados,
            intentoReutilizado: !reiniciar,
          });
        }
      }

      throw error;
    }
  }

  static async enviarExamen(id_intento, id_usuario, respuestasUsuario) {
    if (!Array.isArray(respuestasUsuario)) {
      throw new Error("VALIDACION: El formato de las respuestas es inválido.");
    }

    const t = await sequelize.transaction();

    try {
      const intento = await Intento.findOne({
        where: { id_intento, id_usuario, estado: "EN_PROGRESO" },
        transaction: t,
      });
      if (!intento) {
        throw new Error(
          "NO_ENCONTRADO: Intento no encontrado o ya fue finalizado.",
        );
      }

      const configuracion = await ConfiguracionExamen.findByPk(intento.id_config, {
        transaction: t,
      });

      const ahora = new Date();
      const minutosTranscurridos =
        (ahora.getTime() - new Date(intento.fecha_inicio).getTime()) / 60000;

      if (
        configuracion.tiempo_limite_min &&
        minutosTranscurridos >
          configuracion.tiempo_limite_min + TOLERANCIA_TIEMPO_MIN
      ) {
        await intento.update(
          { estado: "FINALIZADO", fecha_fin: new Date(), nota_final: 0 },
          { transaction: t },
        );
        await t.commit();
        return {
          nota_final: 0,
          preguntas_correctas: 0,
          total_preguntas: 0,
          porcentaje: 0,
          intentos_restantes: null,
          tiempo_expirado: true,
        };
      }

      const snapshot = Array.isArray(intento.preguntas_snapshot_json)
        ? intento.preguntas_snapshot_json
        : await EvaluacionService.#snapshotFallbackLegacy(configuracion, t);

      const snapshotMap = new Map(snapshot.map((p) => [p.id_pregunta, p]));

      const respuestasNormalizadas = respuestasUsuario.map((r) => {
        const id = Number(r.id_pregunta);
        const pregunta = snapshotMap.get(id);
        if (!pregunta) {
          throw new Error(
            `VALIDACION: La pregunta ${r.id_pregunta} no pertenece a este examen.`,
          );
        }
        return EvaluacionService.#normalizarRespuestaEntrada(r, pregunta.tipo_pregunta);
      });

      const idsUnicos = new Set(respuestasNormalizadas.map((r) => r.id_pregunta));
      if (idsUnicos.size !== respuestasNormalizadas.length) {
        throw new Error("VALIDACION: Existen preguntas duplicadas en respuestas.");
      }

      let totalPuntos = 0;
      let totalCorrectas = 0;

      const detallesAInsertar = respuestasNormalizadas.map((respuestaNorm) => {
        const pregunta = snapshotMap.get(respuestaNorm.id_pregunta);
        const resultado = EvaluacionService.#esTipoLegacy(pregunta.tipo_pregunta)
          ? EvaluacionService.#calcularPuntajeLegacy(pregunta, respuestaNorm)
          : EvaluacionService.#calcularPuntajeNoLegacy(pregunta, respuestaNorm, {
              pregunta_id: respuestaNorm.id_pregunta,
              intento_id: id_intento,
            });

        totalPuntos += resultado.puntos_obtenidos;
        if (resultado.es_correcta_snapshot) totalCorrectas++;

        return {
          id_intento,
          id_pregunta: respuestaNorm.id_pregunta,
          id_opcion_elegida: resultado.id_opcion_elegida ?? null,
          respuesta_json: resultado.respuesta_json ?? null,
          es_correcta_snapshot: resultado.es_correcta_snapshot,
          puntos_obtenidos: resultado.puntos_obtenidos,
        };
      });

      await DetalleIntento.bulkCreate(detallesAInsertar, { transaction: t });

      const totalRespondidas = detallesAInsertar.length;
      const promedio = totalRespondidas > 0 ? totalPuntos / totalRespondidas : 0;
      const notaFinal = Number((promedio * 10).toFixed(2));
      const porcentaje = Number((promedio * 100).toFixed(1));

      await intento.update(
        { fecha_fin: ahora, estado: "FINALIZADO", nota_final: notaFinal },
        { transaction: t },
      );

      await t.commit();

      return {
        id_intento: intento.id_intento,
        estado: "FINALIZADO",
        nota_final: notaFinal,
        preguntas_correctas: totalCorrectas,
        total_preguntas: totalRespondidas,
        porcentaje,
        detalle: detallesAInsertar.map((detalle) =>
          EvaluacionService.#buildDetalleDTO(
            detalle,
            snapshotMap.get(detalle.id_pregunta),
          ),
        ),
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async retomarExamen(id_intento, id_usuario) {
    const intento = await Intento.findOne({
      where: { id_intento, id_usuario, estado: "EN_PROGRESO" },
      include: [{ model: ConfiguracionExamen, as: "configuracion" }],
    });

    if (!intento) {
      throw new Error("NO_ENCONTRADO: Intento en progreso no encontrado.");
    }

    const configuracion = intento.configuracion;

    const snapshot = Array.isArray(intento.preguntas_snapshot_json)
      ? intento.preguntas_snapshot_json
      : await EvaluacionService.#snapshotFallbackLegacy(configuracion, null);

    return EvaluacionService.#buildIntentoRendicionDTO({
      intento,
      configuracion,
      snapshot,
      intentosFinalizados: await Intento.count({
        where: {
          id_usuario,
          id_config: intento.id_config,
          estado: "FINALIZADO",
        },
      }),
      intentoReutilizado: true,
    });
  }

  static async guardarProgresoExamen(id_intento, id_usuario, progreso) {
    const intento = await Intento.findOne({
      where: { id_intento, id_usuario, estado: "EN_PROGRESO" },
      include: [{ model: ConfiguracionExamen, as: "configuracion" }],
    });

    if (!intento) {
      throw new Error("NO_ENCONTRADO: Intento en progreso no encontrado.");
    }

    const snapshot = Array.isArray(intento.preguntas_snapshot_json)
      ? intento.preguntas_snapshot_json
      : await EvaluacionService.#snapshotFallbackLegacy(intento.configuracion, null);

    const totalPreguntas = snapshot.length;
    const respuestasEntrada =
      progreso?.respuestas && typeof progreso.respuestas === "object"
        ? progreso.respuestas
        : {};

    const respuestasNormalizadas = {};
    const idsSnapshot = new Set(snapshot.map((p) => Number(p.id_pregunta)));

    for (const [key, value] of Object.entries(respuestasEntrada)) {
      const idPregunta = Number(key);
      if (!Number.isInteger(idPregunta) || idPregunta <= 0) {
        throw new Error("VALIDACION: progreso.respuestas contiene id_pregunta inválido.");
      }
      if (!idsSnapshot.has(idPregunta)) {
        throw new Error(
          `VALIDACION: La pregunta ${idPregunta} no pertenece a este examen.`,
        );
      }
      if (!value || typeof value !== "object") {
        throw new Error("VALIDACION: progreso.respuestas contiene payload inválido.");
      }
      respuestasNormalizadas[idPregunta] = value;
    }

    const indiceActual = Number(progreso?.indice_actual);
    if (!Number.isInteger(indiceActual) || indiceActual < 0) {
      throw new Error("VALIDACION: progreso.indice_actual inválido.");
    }

    const indiceAjustado = Math.min(indiceActual, Math.max(totalPreguntas - 1, 0));

    const ahora = new Date();

    await intento.update({
      progreso_respuestas_json: respuestasNormalizadas,
      progreso_indice_actual: indiceAjustado,
      ultima_actividad_at: ahora,
    });

    return {
      id_intento: intento.id_intento,
      progreso: {
        respuestas: respuestasNormalizadas,
        indice_actual: indiceAjustado,
        ultima_actividad_at: ahora,
      },
      tiempo_restante_seg: EvaluacionService.#calcularTiempoRestanteSegundos(
        intento,
        intento.configuracion,
      ),
    };
  }

  static async obtenerIntento(id_intento, id_usuario) {
    const intento = await Intento.findOne({
      where: { id_intento, id_usuario },
      include: [
        {
          model: DetalleIntento,
          as: "respuestas_detalle",
          include: [
            {
              model: BancoPregunta,
              attributes: ["id_pregunta", "enunciado", "tipo_pregunta"],
            },
          ],
        },
        {
          model: ConfiguracionExamen,
          as: "configuracion",
          include: [
            {
              model: Materia,
              attributes: ["id_materia", "nombre"],
            },
          ],
        },
      ],
    });

    if (!intento) {
      throw new Error("NO_ENCONTRADO: Intento no encontrado.");
    }

    return intento.get({ plain: true });
  }

  static async obtenerHistorial(id_usuario) {
    const intentos = await Intento.findAll({
      where: { id_usuario, estado: "FINALIZADO" },
      include: [
        {
          model: ConfiguracionExamen,
          as: "configuracion",
          include: [
            {
              model: Materia,
              attributes: ["id_materia", "nombre"],
            },
          ],
        },
      ],
      attributes: [
        "id_intento",
        "fecha_inicio",
        "fecha_fin",
        "nota_final",
        "estado",
      ],
      order: [["fecha_fin", "DESC"]],
    });

    return intentos.map((i) => i.get({ plain: true }));
  }

  static async obtenerConfiguracionesPorMateria(id_materia) {
    if (!id_materia) {
      throw new Error("VALIDACION: El id_materia es requerido.");
    }

    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia", "nombre"],
    });
    if (!materia) {
      throw new Error("NO_ENCONTRADO: La materia no existe.");
    }

    const configuraciones = await ConfiguracionExamen.findAll({
      where: { id_materia },
      order: [["modo", "ASC"]],
    });

    const totalPreguntas = await BancoPregunta.count({
      where: { id_materia, activo: true },
    });

    return {
      materia: materia.get({ plain: true }),
      total_preguntas_activas: totalPreguntas,
      configuraciones: configuraciones.map((c) => {
        const raw = c.get({ plain: true });
        return {
          id_config: raw.id_config,
          modo: raw.modo,
          tiempo_limite_min: raw.tiempo_limite_min,
          intentos_permitidos:
            raw.modo === "TEST" ? null : raw.intentos_permitidos,
        };
      }),
    };
  }

  static __testCalcularPuntajeCompletar(estructura, respuesta, contexto = {}) {
    return EvaluacionService.#calcularPuntajeCompletar(estructura, respuesta, contexto);
  }

  static __testResolverModoCompletar(estructura, preguntaId, intentoId) {
    return EvaluacionService.#resolverModoCompletar(estructura, preguntaId, intentoId);
  }

  static __testFeatureFlags() {
    return featureFlags;
  }

  static async upsertConfiguracion(id_materia, datos) {
    const { modo, tiempo_limite_min, intentos_permitidos } = datos;

    if (!id_materia) throw new Error("VALIDACION: El id_materia es requerido.");
    if (!modo || !["TEST", "EXAMEN"].includes(modo)) {
      throw new Error("VALIDACION: El modo debe ser 'TEST' o 'EXAMEN'.");
    }
    if (
      tiempo_limite_min !== undefined &&
      tiempo_limite_min !== null &&
      (!Number.isInteger(tiempo_limite_min) || tiempo_limite_min < 1)
    ) {
      throw new Error(
        "VALIDACION: tiempo_limite_min debe ser un entero > 0 o null.",
      );
    }

    let intentosNormalizados;
    if (modo === "TEST") {
      intentosNormalizados = null;
    } else if (intentos_permitidos === undefined) {
      intentosNormalizados = 1;
    } else if (intentos_permitidos === null) {
      intentosNormalizados = null;
    } else if (
      !Number.isInteger(intentos_permitidos) ||
      intentos_permitidos < 1
    ) {
      throw new Error(
        "VALIDACION: intentos_permitidos debe ser un entero >= 1 o null para infinito.",
      );
    } else {
      intentosNormalizados = intentos_permitidos;
    }

    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia"],
    });
    if (!materia) throw new Error("NO_ENCONTRADO: La materia no existe.");

    const existente = await ConfiguracionExamen.findOne({
      where: { id_materia, modo },
    });

    const payload = {
      id_materia,
      modo,
      tiempo_limite_min: tiempo_limite_min ?? null,
      intentos_permitidos: intentosNormalizados,
    };

    let config;
    let creado = false;

    if (existente) {
      await existente.update(payload);
      config = existente;
    } else {
      config = await ConfiguracionExamen.create(payload);
      creado = true;
    }

    const raw = config.get({ plain: true });
    return {
      creado,
      config: {
        id_config: raw.id_config,
        id_materia: raw.id_materia,
        modo: raw.modo,
        tiempo_limite_min: raw.tiempo_limite_min,
        intentos_permitidos: raw.intentos_permitidos,
      },
    };
  }

  static async eliminarConfiguracion(id_config) {
    const config = await ConfiguracionExamen.findByPk(id_config);
    if (!config) throw new Error("NO_ENCONTRADO: Configuración no encontrada.");

    const enProgreso = await Intento.count({
      where: { id_config, estado: "EN_PROGRESO" },
    });
    if (enProgreso > 0) {
      throw new Error(
        `RESTRICCION: No se puede eliminar: ${enProgreso} intento(s) en progreso usan esta configuración.`,
      );
    }

    await config.destroy();
    return { mensaje: "Configuración eliminada correctamente." };
  }
}
