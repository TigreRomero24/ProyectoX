import { sequelize } from "../config/database.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Materia } from "../models/academico.models/materia.js";
import { DetalleIntento } from "../models/evaluacion.models/detalleIntento.js";
import { Intento } from "../models/evaluacion.models/intento.js";
import { resolveCompletarModeWithFlags } from "../config/featureFlags.js";

const TIPOS_PERMITIDOS = [
  "MULTIPLE",
  "SELECCION_MULTIPLE",
  "ORDENAR",
  "RELACIONAR",
  "VERDADERO_FALSO",
  "COMPLETAR",
];

const TIPOS_LEGACY = ["MULTIPLE", "VERDADERO_FALSO"];
const COMPLETAR_MODOS = ["ESCRIBIR", "ARRASTRAR"];
const COMPLETAR_ID_REGEX = /^[a-zA-Z0-9_-]{1,32}$/;

const crearErrorCompletar = (codigo, mensaje) =>
  new Error(`VALIDACION: ${codigo}: ${mensaje}`);

const logCompletar = (evento, payload) => {
  console.info(`[${evento}]`, payload);
};

const normalizarTexto = (valor, campo) => {
  if (typeof valor !== "string") {
    throw new Error(`VALIDACION: El campo '${campo}' debe ser texto.`);
  }
  const texto = valor.trim();
  if (!texto) {
    throw new Error(`VALIDACION: El campo '${campo}' no puede estar vacío.`);
  }
  return texto;
};

const assertSinCamposExtra = (obj, permitidos, contexto) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(`VALIDACION: '${contexto}' debe ser un objeto válido.`);
  }
  for (const key of Object.keys(obj)) {
    if (!permitidos.includes(key)) {
      throw new Error(
        `VALIDACION: Campo no permitido '${key}' en '${contexto}'.`,
      );
    }
  }
};

const normalizarIdInterno = (valor, campo) => {
  const id = normalizarTexto(String(valor ?? ""), campo);
  return id;
};

const idsUnicos = (ids, contexto) => {
  const set = new Set(ids);
  if (set.size !== ids.length) {
    throw new Error(`VALIDACION: IDs duplicados en '${contexto}'.`);
  }
};

export class AcademicoService {
  static esTipoLegacy(tipo) {
    return TIPOS_LEGACY.includes(tipo);
  }

  static #validarTipo(tipo) {
    if (!TIPOS_PERMITIDOS.includes(tipo)) {
      throw new Error(
        `VALIDACION: Tipo de pregunta inválido. Permitidos: ${TIPOS_PERMITIDOS.join(", ")}.`,
      );
    }
  }

  static #buildPreguntaDTO(datos) {
    const dto = {};
    if (datos.id_materia !== undefined) dto.id_materia = datos.id_materia;
    if (datos.enunciado !== undefined) dto.enunciado = datos.enunciado;
    if (datos.tipo_pregunta !== undefined) dto.tipo_pregunta = datos.tipo_pregunta;
    if (datos.url_imagen !== undefined) dto.url_imagen = datos.url_imagen;
    if (datos.estructura_json !== undefined)
      dto.estructura_json = datos.estructura_json;
    return dto;
  }

  static #buildOpcionDTO(opcion, id_pregunta) {
    return {
      id_pregunta,
      texto: opcion.texto,
      es_correcta: opcion.es_correcta === true,
    };
  }

  static #normalizarEstructura(tipo_pregunta, estructura_json) {
    assertSinCamposExtra(
      estructura_json,
      [
        "tipo",
        "opciones",
        "respuesta",
        "explicacion",
        "items",
        "izquierda",
        "derecha",
        "texto",
        "espacios",
        "modo_interaccion",
        "opciones_arrastrar",
      ],
      "estructura_json",
    );

    if (estructura_json.tipo !== tipo_pregunta) {
      throw new Error(
        "VALIDACION: estructura_json.tipo debe coincidir con tipo_pregunta.",
      );
    }

    const base = { tipo: tipo_pregunta };
    if (estructura_json.explicacion !== undefined) {
      base.explicacion = normalizarTexto(
        estructura_json.explicacion,
        "estructura_json.explicacion",
      );
    }

    if (tipo_pregunta === "MULTIPLE" || tipo_pregunta === "SELECCION_MULTIPLE") {
      assertSinCamposExtra(
        estructura_json,
        ["tipo", "opciones", "respuesta", "explicacion"],
        "estructura_json",
      );
      if (!Array.isArray(estructura_json.opciones)) {
        throw new Error("VALIDACION: estructura_json.opciones debe ser un arreglo.");
      }
      const min = tipo_pregunta === "MULTIPLE" ? 2 : 3;
      const max = tipo_pregunta === "MULTIPLE" ? 6 : 8;
      if (
        estructura_json.opciones.length < min ||
        estructura_json.opciones.length > max
      ) {
        throw new Error(
          `VALIDACION: ${tipo_pregunta} requiere entre ${min} y ${max} opciones.`,
        );
      }

      const opciones = estructura_json.opciones.map((op, idx) => {
        assertSinCamposExtra(op, ["opcion_id", "texto"], `opciones[${idx}]`);
        return {
          opcion_id: normalizarIdInterno(
            op.opcion_id,
            `opciones[${idx}].opcion_id`,
          ),
          texto: normalizarTexto(op.texto, `opciones[${idx}].texto`),
        };
      });

      const ids = opciones.map((o) => o.opcion_id);
      idsUnicos(ids, "estructura_json.opciones");

      assertSinCamposExtra(
        estructura_json.respuesta,
        tipo_pregunta === "MULTIPLE" ? ["opcion_id"] : ["opciones_ids"],
        "estructura_json.respuesta",
      );

      if (tipo_pregunta === "MULTIPLE") {
        const opcion_id = normalizarIdInterno(
          estructura_json.respuesta?.opcion_id,
          "estructura_json.respuesta.opcion_id",
        );
        if (!ids.includes(opcion_id)) {
          throw new Error(
            "VALIDACION: respuesta.opcion_id no existe en estructura_json.opciones.",
          );
        }
        return {
          ...base,
          opciones,
          respuesta: { opcion_id },
        };
      }

      const opciones_ids = Array.isArray(estructura_json.respuesta?.opciones_ids)
        ? estructura_json.respuesta.opciones_ids.map((id, i) =>
            normalizarIdInterno(id, `respuesta.opciones_ids[${i}]`),
          )
        : null;

      if (!opciones_ids || opciones_ids.length < 2) {
        throw new Error(
          "VALIDACION: SELECCION_MULTIPLE requiere al menos 2 respuestas correctas.",
        );
      }
      if (opciones_ids.length >= opciones.length) {
        throw new Error(
          "VALIDACION: SELECCION_MULTIPLE no puede marcar todas las opciones como correctas.",
        );
      }
      idsUnicos(opciones_ids, "respuesta.opciones_ids");
      if (opciones_ids.some((id) => !ids.includes(id))) {
        throw new Error(
          "VALIDACION: respuesta.opciones_ids contiene IDs que no existen en opciones.",
        );
      }

      return {
        ...base,
        opciones,
        respuesta: { opciones_ids },
      };
    }

    if (tipo_pregunta === "ORDENAR") {
      assertSinCamposExtra(
        estructura_json,
        ["tipo", "items", "respuesta", "explicacion"],
        "estructura_json",
      );
      if (!Array.isArray(estructura_json.items)) {
        throw new Error("VALIDACION: estructura_json.items debe ser un arreglo.");
      }
      if (estructura_json.items.length < 3 || estructura_json.items.length > 8) {
        throw new Error("VALIDACION: ORDENAR requiere entre 3 y 8 items.");
      }
      const items = estructura_json.items.map((it, idx) => {
        assertSinCamposExtra(it, ["item_id", "texto"], `items[${idx}]`);
        return {
          item_id: normalizarIdInterno(it.item_id, `items[${idx}].item_id`),
          texto: normalizarTexto(it.texto, `items[${idx}].texto`),
        };
      });
      const ids = items.map((i) => i.item_id);
      idsUnicos(ids, "estructura_json.items");

      assertSinCamposExtra(
        estructura_json.respuesta,
        ["orden_ids"],
        "estructura_json.respuesta",
      );
      if (!Array.isArray(estructura_json.respuesta?.orden_ids)) {
        throw new Error(
          "VALIDACION: estructura_json.respuesta.orden_ids debe ser un arreglo.",
        );
      }

      const orden_ids = estructura_json.respuesta.orden_ids.map((id, idx) =>
        normalizarIdInterno(id, `respuesta.orden_ids[${idx}]`),
      );
      if (orden_ids.length !== items.length) {
        throw new Error(
          "VALIDACION: ORDENAR requiere una permutación completa de items.",
        );
      }
      idsUnicos(orden_ids, "respuesta.orden_ids");
      if (orden_ids.some((id) => !ids.includes(id))) {
        throw new Error(
          "VALIDACION: respuesta.orden_ids contiene IDs que no existen en items.",
        );
      }

      return {
        ...base,
        items,
        respuesta: { orden_ids },
      };
    }

    if (tipo_pregunta === "RELACIONAR") {
      assertSinCamposExtra(
        estructura_json,
        ["tipo", "izquierda", "derecha", "respuesta", "explicacion"],
        "estructura_json",
      );
      if (!Array.isArray(estructura_json.izquierda)) {
        throw new Error(
          "VALIDACION: estructura_json.izquierda debe ser un arreglo.",
        );
      }
      if (!Array.isArray(estructura_json.derecha)) {
        throw new Error(
          "VALIDACION: estructura_json.derecha debe ser un arreglo.",
        );
      }
      if (
        estructura_json.izquierda.length < 2 ||
        estructura_json.izquierda.length > 8 ||
        estructura_json.derecha.length < 2 ||
        estructura_json.derecha.length > 8
      ) {
        throw new Error(
          "VALIDACION: RELACIONAR requiere entre 2 y 8 elementos por lado.",
        );
      }

      const izquierda = estructura_json.izquierda.map((it, idx) => {
        assertSinCamposExtra(
          it,
          ["izquierda_id", "texto"],
          `izquierda[${idx}]`,
        );
        return {
          izquierda_id: normalizarIdInterno(
            it.izquierda_id,
            `izquierda[${idx}].izquierda_id`,
          ),
          texto: normalizarTexto(it.texto, `izquierda[${idx}].texto`),
        };
      });
      const derecha = estructura_json.derecha.map((it, idx) => {
        assertSinCamposExtra(it, ["derecha_id", "texto"], `derecha[${idx}]`);
        return {
          derecha_id: normalizarIdInterno(
            it.derecha_id,
            `derecha[${idx}].derecha_id`,
          ),
          texto: normalizarTexto(it.texto, `derecha[${idx}].texto`),
        };
      });

      const idsIzq = izquierda.map((i) => i.izquierda_id);
      const idsDer = derecha.map((i) => i.derecha_id);
      idsUnicos(idsIzq, "estructura_json.izquierda");
      idsUnicos(idsDer, "estructura_json.derecha");

      assertSinCamposExtra(
        estructura_json.respuesta,
        ["pares"],
        "estructura_json.respuesta",
      );
      if (!Array.isArray(estructura_json.respuesta?.pares)) {
        throw new Error("VALIDACION: respuesta.pares debe ser un arreglo.");
      }
      if (estructura_json.respuesta.pares.length !== izquierda.length) {
        throw new Error(
          "VALIDACION: RELACIONAR requiere un par por cada elemento de la izquierda.",
        );
      }

      const pares = estructura_json.respuesta.pares.map((par, idx) => {
        assertSinCamposExtra(
          par,
          ["izquierda_id", "derecha_id"],
          `respuesta.pares[${idx}]`,
        );
        return {
          izquierda_id: normalizarIdInterno(
            par.izquierda_id,
            `respuesta.pares[${idx}].izquierda_id`,
          ),
          derecha_id: normalizarIdInterno(
            par.derecha_id,
            `respuesta.pares[${idx}].derecha_id`,
          ),
        };
      });

      const paresIzq = pares.map((p) => p.izquierda_id);
      const paresDer = pares.map((p) => p.derecha_id);
      idsUnicos(paresIzq, "respuesta.pares.izquierda_id");
      idsUnicos(paresDer, "respuesta.pares.derecha_id");
      if (paresIzq.some((id) => !idsIzq.includes(id))) {
        throw new Error(
          "VALIDACION: respuesta.pares contiene izquierda_id inexistente.",
        );
      }
      if (paresDer.some((id) => !idsDer.includes(id))) {
        throw new Error(
          "VALIDACION: respuesta.pares contiene derecha_id inexistente.",
        );
      }

      return {
        ...base,
        izquierda,
        derecha,
        respuesta: { pares },
      };
    }

    if (tipo_pregunta === "VERDADERO_FALSO") {
      assertSinCamposExtra(
        estructura_json,
        ["tipo", "opciones", "respuesta", "explicacion"],
        "estructura_json",
      );
      if (!Array.isArray(estructura_json.opciones)) {
        throw new Error("VALIDACION: estructura_json.opciones debe ser un arreglo.");
      }
      if (estructura_json.opciones.length !== 2) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO debe tener exactamente 2 opciones.",
        );
      }

      const opciones = estructura_json.opciones.map((op, idx) => {
        assertSinCamposExtra(op, ["opcion_id", "texto"], `opciones[${idx}]`);
        return {
          opcion_id: normalizarIdInterno(
            op.opcion_id,
            `opciones[${idx}].opcion_id`,
          ),
          texto: normalizarTexto(op.texto, `opciones[${idx}].texto`),
        };
      });
      const ids = opciones.map((o) => o.opcion_id);
      idsUnicos(ids, "estructura_json.opciones");
      if (!(ids.includes("V") && ids.includes("F"))) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO requiere opciones con IDs V y F.",
        );
      }

      assertSinCamposExtra(
        estructura_json.respuesta,
        ["opcion_id"],
        "estructura_json.respuesta",
      );
      const opcion_id = normalizarIdInterno(
        estructura_json.respuesta?.opcion_id,
        "estructura_json.respuesta.opcion_id",
      );
      if (!["V", "F"].includes(opcion_id)) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO respuesta.opcion_id debe ser V o F.",
        );
      }

      return {
        ...base,
        opciones,
        respuesta: { opcion_id },
      };
    }

    if (tipo_pregunta === "COMPLETAR") {
      assertSinCamposExtra(
        estructura_json,
        [
          "tipo",
          "texto",
          "espacios",
          "respuesta",
          "explicacion",
          "modo_interaccion",
          "opciones_arrastrar",
        ],
        "estructura_json",
      );
      const texto = normalizarTexto(estructura_json.texto, "estructura_json.texto");

      const modoRaw = String(estructura_json.modo_interaccion ?? "").trim();
      const requestedModo = modoRaw ? modoRaw.toUpperCase() : "ESCRIBIR";
      if (!COMPLETAR_MODOS.includes(requestedModo)) {
        throw crearErrorCompletar(
          "COMPLETAR_INVALID_MODO",
          "Modo de interaccion invalido. Use ESCRIBIR o ARRASTRAR.",
        );
      }

      const modoResolution = resolveCompletarModeWithFlags(requestedModo);
      const modo_interaccion = modoResolution.resolved;

      if (!modoRaw) {
        logCompletar("completar.legacy.fallback_mode", {
          pregunta_id: null,
          modo_recibido: estructura_json.modo_interaccion ?? null,
          modo_resuelto: "ESCRIBIR",
          actor: "autor",
        });
      } else if (modoResolution.fallbackApplied) {
        logCompletar("completar.legacy.fallback_mode", {
          pregunta_id: null,
          modo_recibido: requestedModo,
          modo_resuelto: "ESCRIBIR",
          actor: "autor",
          motivo: modoResolution.reason,
        });
      }

      if (!Array.isArray(estructura_json.espacios)) {
        throw new Error("VALIDACION: estructura_json.espacios debe ser un arreglo.");
      }
      if (estructura_json.espacios.length < 1 || estructura_json.espacios.length > 8) {
        throw new Error("VALIDACION: COMPLETAR requiere entre 1 y 8 espacios.");
      }

      const espacios = estructura_json.espacios.map((esp, idx) => {
        assertSinCamposExtra(
          esp,
          ["espacio_id", "posicion", "respuestas_aceptadas", "puntaje"],
          `espacios[${idx}]`,
        );
        const espacio_id = normalizarIdInterno(
          esp.espacio_id,
          `espacios[${idx}].espacio_id`,
        );
        if (!COMPLETAR_ID_REGEX.test(espacio_id)) {
          throw crearErrorCompletar(
            "COMPLETAR_ESPACIO_INCONSISTENTE",
            `El espacio_id '${espacio_id}' no cumple el formato permitido.`,
          );
        }
        const posicion = Number(esp.posicion);
        if (!Number.isInteger(posicion) || posicion <= 0) {
          throw new Error(
            `VALIDACION: espacios[${idx}].posicion debe ser entero positivo.`,
          );
        }

        const puntaje =
          esp.puntaje === undefined || esp.puntaje === null ? 1 : Number(esp.puntaje);
        if (!Number.isFinite(puntaje) || puntaje <= 0) {
          throw crearErrorCompletar(
            "COMPLETAR_ESPACIO_INCONSISTENTE",
            `El puntaje de '${espacio_id}' debe ser mayor a 0.`,
          );
        }

        const respuestas_aceptadas = Array.isArray(esp.respuestas_aceptadas)
          ? esp.respuestas_aceptadas.map((v, i) =>
              normalizarTexto(v, `espacios[${idx}].respuestas_aceptadas[${i}]`),
            )
          : [];

        return {
          espacio_id,
          posicion,
          puntaje,
          respuestas_aceptadas,
        };
      });
      const espaciosIds = espacios.map((e) => e.espacio_id);
      idsUnicos(espaciosIds, "estructura_json.espacios.espacio_id");

      const posiciones = espacios.map((e) => e.posicion);
      idsUnicos(posiciones, "estructura_json.espacios.posicion");

      const regex = /\[\[([^\]]+)\]\]/g;
      const marcadores = [];
      let match;
      while ((match = regex.exec(texto))) {
        marcadores.push(normalizarIdInterno(match[1], "estructura_json.texto"));
      }

      idsUnicos(marcadores, "marcadores de estructura_json.texto");

      if (marcadores.length !== espacios.length) {
        throw crearErrorCompletar(
          "COMPLETAR_ESPACIO_INCONSISTENTE",
          "Los espacios del enunciado no coinciden con la configuracion.",
        );
      }
      if (marcadores.some((id) => !espaciosIds.includes(id))) {
        throw crearErrorCompletar(
          "COMPLETAR_ESPACIO_INCONSISTENTE",
          "Los espacios del enunciado no coinciden con la configuracion.",
        );
      }

      const mapaAceptadas = new Map();

      if (Array.isArray(estructura_json.respuesta?.aceptadas)) {
        for (const [idx, acc] of estructura_json.respuesta.aceptadas.entries()) {
          assertSinCamposExtra(
            acc,
            ["espacio_id", "valores"],
            `respuesta.aceptadas[${idx}]`,
          );
          const espacio_id = normalizarIdInterno(
            acc.espacio_id,
            `respuesta.aceptadas[${idx}].espacio_id`,
          );
          const valores = Array.isArray(acc.valores)
            ? acc.valores.map((v, i) =>
                normalizarTexto(v, `respuesta.aceptadas[${idx}].valores[${i}]`),
              )
            : [];
          if (valores.length === 0) {
            throw crearErrorCompletar(
              "COMPLETAR_RESPUESTA_ACEPTADA_VACIA",
              "Las respuestas aceptadas no pueden estar vacias.",
            );
          }
          mapaAceptadas.set(espacio_id, valores);
        }
      }

      for (const esp of espacios) {
        const valores = mapaAceptadas.get(esp.espacio_id) ?? esp.respuestas_aceptadas;
        const clean = valores
          .map((v) => String(v).trim())
          .filter(Boolean)
          .filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

        if (clean.length === 0) {
          throw crearErrorCompletar(
            "COMPLETAR_RESPUESTA_ACEPTADA_VACIA",
            `El espacio '${esp.espacio_id}' requiere al menos una respuesta aceptada.`,
          );
        }
        mapaAceptadas.set(esp.espacio_id, clean);
      }

      if (estructura_json.respuesta !== undefined) {
        assertSinCamposExtra(
          estructura_json.respuesta,
          ["aceptadas", "normalizacion"],
          "estructura_json.respuesta",
        );
        if (
          estructura_json.respuesta.normalizacion !== undefined &&
          estructura_json.respuesta.normalizacion !== "LOWER_TRIM"
        ) {
          throw new Error(
            "VALIDACION: COMPLETAR requiere respuesta.normalizacion = LOWER_TRIM.",
          );
        }
      }

      const aceptadas = espacios.map((esp) => ({
        espacio_id: esp.espacio_id,
        valores: mapaAceptadas.get(esp.espacio_id),
      }));

      let opciones_arrastrar;
      if (estructura_json.opciones_arrastrar !== undefined) {
        if (!Array.isArray(estructura_json.opciones_arrastrar)) {
          throw crearErrorCompletar(
            "COMPLETAR_ARRASTRAR_SIN_FICHAS",
            "Debe agregar fichas para el modo arrastrar.",
          );
        }
        opciones_arrastrar = estructura_json.opciones_arrastrar.map((op, idx) => {
          assertSinCamposExtra(op, ["ficha_id", "texto"], `opciones_arrastrar[${idx}]`);
          return {
            ficha_id: normalizarIdInterno(
              op.ficha_id,
              `opciones_arrastrar[${idx}].ficha_id`,
            ),
            texto: normalizarTexto(op.texto, `opciones_arrastrar[${idx}].texto`),
          };
        });
      }

      if (modo_interaccion === "ARRASTRAR") {
        if (!Array.isArray(opciones_arrastrar) || opciones_arrastrar.length === 0) {
          throw crearErrorCompletar(
            "COMPLETAR_ARRASTRAR_SIN_FICHAS",
            "Debe agregar fichas para el modo arrastrar.",
          );
        }
        if (
          opciones_arrastrar.length < espacios.length ||
          opciones_arrastrar.length > espacios.length + 8
        ) {
          throw crearErrorCompletar(
            "COMPLETAR_ARRASTRAR_SIN_FICHAS",
            "La cantidad de fichas debe estar entre N y N+8.",
          );
        }
        const fichaIds = opciones_arrastrar.map((op) => op.ficha_id);
        if (new Set(fichaIds).size !== fichaIds.length) {
          throw crearErrorCompletar(
            "COMPLETAR_FICHA_DUPLICADA",
            "Hay fichas duplicadas en el banco de opciones.",
          );
        }
      }

      const espaciosFinal = espacios.map((esp) => ({
        espacio_id: esp.espacio_id,
        posicion: esp.posicion,
        puntaje: esp.puntaje,
        respuestas_aceptadas: mapaAceptadas.get(esp.espacio_id),
      }));

      return {
        ...base,
        modo_interaccion,
        texto,
        espacios: espaciosFinal,
        respuesta: {
          aceptadas,
          normalizacion: "LOWER_TRIM",
        },
        ...(Array.isArray(opciones_arrastrar)
          ? { opciones_arrastrar }
          : {}),
      };
    }

    throw new Error("VALIDACION: Tipo de pregunta no soportado.");
  }

  static #estructuraDesdeLegacy(tipo_pregunta, opciones = []) {
    if (!TIPOS_LEGACY.includes(tipo_pregunta) || !Array.isArray(opciones)) {
      return null;
    }
    const opcionesCanonicas = opciones.map((o, idx) => ({
      opcion_id:
        tipo_pregunta === "VERDADERO_FALSO"
          ? o.texto?.toLowerCase() === "falso"
            ? "F"
            : "V"
          : String.fromCharCode(65 + idx),
      texto: o.texto,
      es_correcta: o.es_correcta === true,
    }));

    const correcta = opcionesCanonicas.find((o) => o.es_correcta);
    if (!correcta) return null;

    return {
      tipo: tipo_pregunta,
      opciones: opcionesCanonicas.map((o) => ({
        opcion_id: o.opcion_id,
        texto: o.texto,
      })),
      respuesta: {
        opcion_id: correcta.opcion_id,
      },
    };
  }

  static #buildLegacyOptionsFromEstructura(tipo_pregunta, estructura_json) {
    if (!TIPOS_LEGACY.includes(tipo_pregunta)) return [];
    if (!estructura_json?.opciones || !estructura_json?.respuesta) return [];

    return estructura_json.opciones.map((op) => ({
      texto: op.texto,
      es_correcta: estructura_json.respuesta.opcion_id === op.opcion_id,
    }));
  }

  static #sinRespuesta(estructura_json) {
    if (!estructura_json) return null;
    const copia = JSON.parse(JSON.stringify(estructura_json));
    delete copia.respuesta;
    return copia;
  }

  static async #verificarMateria(id_materia, transaction) {
    const materia = await Materia.findByPk(id_materia, {
      attributes: ["id_materia"],
      transaction,
    });
    if (!materia) {
      throw new Error(
        "NO_ENCONTRADO: La materia asignada no existe en el sistema.",
      );
    }
    return materia;
  }

  static async #contarHistorialPorPregunta(id_pregunta, transaction) {
    return await DetalleIntento.count({
      where: { id_pregunta },
      transaction,
    });
  }

  static async #contarIntentosEnProgresoConPregunta(id_pregunta, transaction) {
    const intentos = await Intento.findAll({
      where: { estado: "EN_PROGRESO" },
      attributes: ["id_intento", "preguntas_snapshot_json"],
      transaction,
    });

    return intentos.filter((intento) => {
      const snapshot = Array.isArray(intento.preguntas_snapshot_json)
        ? intento.preguntas_snapshot_json
        : [];
      return snapshot.some((preg) => Number(preg?.id_pregunta) === id_pregunta);
    }).length;
  }

  static async #evaluarEliminacionFisicaSegura(id_pregunta, transaction) {
    const historial = await AcademicoService.#contarHistorialPorPregunta(
      id_pregunta,
      transaction,
    );
    const intentosEnProgreso =
      await AcademicoService.#contarIntentosEnProgresoConPregunta(
        id_pregunta,
        transaction,
      );

    return {
      historial,
      intentosEnProgreso,
      puedeEliminarFisicamente: historial === 0 && intentosEnProgreso === 0,
    };
  }

  static async #syncLegacyOpciones(
    tipo_pregunta,
    estructura_json,
    id_pregunta,
    transaction,
  ) {
    if (!AcademicoService.esTipoLegacy(tipo_pregunta)) {
      return;
    }

    const opciones = AcademicoService.#buildLegacyOptionsFromEstructura(
      tipo_pregunta,
      estructura_json,
    );

    await OpcionRespuesta.destroy({
      where: { id_pregunta },
      transaction,
    });

    const opcionesAInsertar = opciones.map((opcion) =>
      AcademicoService.#buildOpcionDTO(opcion, id_pregunta),
    );

    await OpcionRespuesta.bulkCreate(opcionesAInsertar, {
      transaction,
      returning: false,
    });
  }

  static #formatPreguntaDTO(preguntaDb, esAdmin = false, incluirRespuestas = false) {
    const data = preguntaDb.get({ plain: true });

    let estructura = data.estructura_json;
    if (!estructura && AcademicoService.esTipoLegacy(data.tipo_pregunta)) {
      estructura = AcademicoService.#estructuraDesdeLegacy(
        data.tipo_pregunta,
        data.opciones,
      );
    }

    let estructuraSalida = estructura;
    if (estructura && !incluirRespuestas) {
      estructuraSalida = AcademicoService.#sinRespuesta(estructura);
    }

    const opcionesSalida = AcademicoService.esTipoLegacy(data.tipo_pregunta)
      ? Array.isArray(data.opciones)
        ? data.opciones.map((o) => {
            const opcionDTO = {
              id_opcion: o.id_opcion,
              texto: o.texto,
            };
            if (esAdmin) opcionDTO.es_correcta = o.es_correcta;
            return opcionDTO;
          })
        : []
      : [];

    return {
      id_pregunta: data.id_pregunta,
      id_materia: data.id_materia,
      enunciado: data.enunciado,
      tipo_pregunta: data.tipo_pregunta,
      url_imagen: data.url_imagen ?? null,
      estructura_json: estructuraSalida,
      activo: data.activo,
      createdAt: data.createdAt,
      opciones: opcionesSalida,
    };
  }

  static #includeOpciones(esAdmin = false) {
    const atributos = ["id_opcion", "texto"];
    if (esAdmin) atributos.push("es_correcta");

    return [
      {
        model: OpcionRespuesta,
        as: "opciones",
        attributes: atributos,
      },
    ];
  }

  static async crearPregunta(datosPregunta) {
    const dto = AcademicoService.#buildPreguntaDTO(datosPregunta);

    if (!dto.id_materia) {
      throw new Error("VALIDACION: El id_materia es obligatorio.");
    }
    if (!dto.enunciado || dto.enunciado.trim() === "") {
      throw new Error("VALIDACION: El enunciado es obligatorio.");
    }
    if (!dto.tipo_pregunta) {
      throw new Error("VALIDACION: El tipo_pregunta es obligatorio.");
    }
    if (!dto.estructura_json) {
      throw new Error("VALIDACION: El campo estructura_json es obligatorio.");
    }

    AcademicoService.#validarTipo(dto.tipo_pregunta);

    dto.estructura_json = AcademicoService.#normalizarEstructura(
      dto.tipo_pregunta,
      dto.estructura_json,
    );

    const t = await sequelize.transaction();

    try {
      await AcademicoService.#verificarMateria(dto.id_materia, t);

      const pregunta = await BancoPregunta.create(dto, { transaction: t });

      await AcademicoService.#syncLegacyOpciones(
        dto.tipo_pregunta,
        dto.estructura_json,
        pregunta.id_pregunta,
        t,
      );

      await t.commit();

      return await AcademicoService.obtenerPreguntaPorId(
        pregunta.id_pregunta,
        false,
        true,
      );
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async obtenerPreguntasPorMateria(
    id_materia,
    soloActivas = true,
    esAdmin = false,
    incluirRespuestas = esAdmin,
  ) {
    if (!id_materia) {
      throw new Error("VALIDACION: El ID de la materia es requerido.");
    }

    await AcademicoService.#verificarMateria(id_materia, null);

    const where = { id_materia };
    if (soloActivas) where.activo = true;

    const preguntasDb = await BancoPregunta.findAll({
      where,
      include: AcademicoService.#includeOpciones(esAdmin),
      order: [["createdAt", "DESC"]],
    });

    return preguntasDb.map((p) =>
      AcademicoService.#formatPreguntaDTO(p, esAdmin, incluirRespuestas),
    );
  }

  static async obtenerPreguntaPorId(
    id_pregunta,
    soloActivas = true,
    esAdmin = false,
    incluirRespuestas = esAdmin,
  ) {
    const where = { id_pregunta };
    if (soloActivas) where.activo = true;

    const preguntaDb = await BancoPregunta.findOne({
      where,
      include: AcademicoService.#includeOpciones(esAdmin),
    });

    if (!preguntaDb) {
      throw new Error(
        soloActivas
          ? "NO_ENCONTRADO: La pregunta no existe o está inactiva."
          : "NO_ENCONTRADO: La pregunta no existe.",
      );
    }

    return AcademicoService.#formatPreguntaDTO(
      preguntaDb,
      esAdmin,
      incluirRespuestas,
    );
  }

  static async actualizarPregunta(id_pregunta, datosPregunta) {
    const dto = AcademicoService.#buildPreguntaDTO(datosPregunta);

    if (Object.keys(dto).length === 0) {
      throw new Error(
        "VALIDACION: No se enviaron campos válidos para actualizar.",
      );
    }

    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        include: AcademicoService.#includeOpciones(true),
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      if (dto.id_materia && dto.id_materia !== pregunta.id_materia) {
        await AcademicoService.#verificarMateria(dto.id_materia, t);
      }

      const tipoFinal = dto.tipo_pregunta ?? pregunta.tipo_pregunta;
      AcademicoService.#validarTipo(tipoFinal);

      let estructuraFinal;
      if (dto.estructura_json !== undefined) {
        estructuraFinal = AcademicoService.#normalizarEstructura(
          tipoFinal,
          dto.estructura_json,
        );
      } else {
        const existente =
          pregunta.estructura_json ??
          AcademicoService.#estructuraDesdeLegacy(
            pregunta.tipo_pregunta,
            pregunta.opciones,
          );
        if (!existente) {
          throw new Error(
            "VALIDACION: La pregunta no tiene estructura_json. Envíe estructura_json para actualizar.",
          );
        }
        estructuraFinal = AcademicoService.#normalizarEstructura(tipoFinal, existente);
      }

      const historial = await AcademicoService.#contarHistorialPorPregunta(
        id_pregunta,
        t,
      );

      if (historial > 0) {
        const estructuraActual = AcademicoService.#normalizarEstructura(
          pregunta.tipo_pregunta,
          pregunta.estructura_json ??
            AcademicoService.#estructuraDesdeLegacy(
              pregunta.tipo_pregunta,
              pregunta.opciones,
            ),
        );

        const cambioTipo = tipoFinal !== pregunta.tipo_pregunta;
        const cambioEstructura =
          JSON.stringify(estructuraFinal) !== JSON.stringify(estructuraActual);

        if (cambioTipo || cambioEstructura) {
          throw new Error(
            `RESTRICCION: No se puede modificar la estructura de la pregunta porque ${historial} respuesta(s) de estudiantes ya referencian esta pregunta. Desactive esta pregunta y cree una nueva versión.`,
          );
        }
      }

      dto.tipo_pregunta = tipoFinal;
      dto.estructura_json = estructuraFinal;

      await pregunta.update(dto, { transaction: t });

      if (AcademicoService.esTipoLegacy(tipoFinal)) {
        await AcademicoService.#syncLegacyOpciones(
          tipoFinal,
          estructuraFinal,
          id_pregunta,
          t,
        );
      } else {
        await OpcionRespuesta.destroy({
          where: { id_pregunta },
          transaction: t,
        });
      }

      await t.commit();

      return await AcademicoService.obtenerPreguntaPorId(
        id_pregunta,
        false,
        true,
      );
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async desactivarPregunta(id_pregunta) {
    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      if (!pregunta.activo) {
        throw new Error("VALIDACION: La pregunta ya se encuentra inactiva.");
      }

      const historial = await AcademicoService.#contarHistorialPorPregunta(
        id_pregunta,
        t,
      );

      pregunta.activo = false;
      await pregunta.save({ transaction: t });

      await t.commit();

      return {
        mensaje: "Pregunta desactivada y oculta del banco correctamente.",
        advertencia:
          historial > 0
            ? `Esta pregunta tiene ${historial} respuesta(s) registrada(s) en intentos previos. Sus estadísticas históricas se mantienen intactas.`
            : null,
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async eliminarPregunta(id_pregunta) {
    return AcademicoService.desactivarPregunta(id_pregunta);
  }

  static async eliminarPreguntaFisica(id_pregunta) {
    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      const seguridad = await AcademicoService.#evaluarEliminacionFisicaSegura(
        id_pregunta,
        t,
      );

      if (!seguridad.puedeEliminarFisicamente) {
        const motivos = [];
        if (seguridad.historial > 0) {
          motivos.push(
            `${seguridad.historial} respuesta(s) histórica(s) registrada(s)`,
          );
        }
        if (seguridad.intentosEnProgreso > 0) {
          motivos.push(
            `${seguridad.intentosEnProgreso} intento(s) en progreso que aún referencian la pregunta`,
          );
        }

        throw new Error(
          `RESTRICCION: No se puede eliminar físicamente la pregunta porque tiene ${motivos.join(" y ")}. Use desactivar/activar para mantener la integridad histórica.`,
        );
      }

      await OpcionRespuesta.destroy({
        where: { id_pregunta },
        transaction: t,
      });

      await pregunta.destroy({ transaction: t });

      await t.commit();

      return {
        mensaje: "Pregunta eliminada físicamente del banco correctamente.",
      };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async activarPregunta(id_pregunta) {
    const t = await sequelize.transaction();

    try {
      const pregunta = await BancoPregunta.findByPk(id_pregunta, {
        transaction: t,
      });

      if (!pregunta) {
        throw new Error("NO_ENCONTRADO: La pregunta no existe.");
      }

      if (pregunta.activo) {
        throw new Error("VALIDACION: La pregunta ya se encuentra activa.");
      }

      pregunta.activo = true;
      await pregunta.save({ transaction: t });

      await t.commit();

      return { mensaje: "Pregunta reactivada en el banco correctamente." };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  static async reactivarPregunta(id_pregunta) {
    return AcademicoService.activarPregunta(id_pregunta);
  }

  static __testNormalizarCompletar(estructura_json) {
    return AcademicoService.#normalizarEstructura("COMPLETAR", estructura_json);
  }

  static #validarOpcionesBulkLegacy(tipo_pregunta, opciones) {
    if (!Array.isArray(opciones) || opciones.length < 2) {
      throw new Error("VALIDACION: Una pregunta debe tener al menos 2 opciones.");
    }

    const correctas = opciones.filter((o) => o.es_correcta === true);
    if (correctas.length === 0) {
      throw new Error("VALIDACION: Debe existir exactamente una opción correcta.");
    }

    if (tipo_pregunta === "VERDADERO_FALSO") {
      if (opciones.length !== 2 || correctas.length !== 1) {
        throw new Error(
          "VALIDACION: VERDADERO_FALSO debe tener exactamente 2 opciones y 1 correcta.",
        );
      }
      return;
    }

    if (tipo_pregunta === "MULTIPLE") {
      if (correctas.length !== 1) {
        throw new Error(
          "VALIDACION: MULTIPLE debe tener exactamente 1 opción correcta.",
        );
      }
      return;
    }

    throw new Error(`VALIDACION: Tipo de pregunta no reconocido: '${tipo_pregunta}'.`);
  }

  static async crearPreguntasBulk(
    id_materia,
    preguntas,
    forzarDuplicados = false,
  ) {
    if (!id_materia) throw new Error("VALIDACION: El id_materia es requerido.");
    if (!Array.isArray(preguntas) || preguntas.length === 0) {
      throw new Error("VALIDACION: Debe enviar al menos una pregunta.");
    }
    if (preguntas.length > 200) {
      throw new Error("VALIDACION: Máximo 200 preguntas por carga.");
    }

    await AcademicoService.#verificarMateria(id_materia, null);

    const existentes = await BancoPregunta.findAll({
      where: { id_materia },
      attributes: ["enunciado"],
    });
    const enunciadosExistentes = new Set(
      existentes.map((p) => p.enunciado.trim().toLowerCase()),
    );

    const aInsertar = [];
    const omitidas = [];
    const errores = [];

    preguntas.forEach((item, idx) => {
      const fila = idx + 2;

      if (!item.enunciado?.trim()) {
        errores.push({
          fila,
          enunciado: item.enunciado || "(vacío)",
          motivo: "Enunciado vacío.",
        });
        return;
      }
      if (
        !item.tipo_pregunta ||
        !["MULTIPLE", "VERDADERO_FALSO"].includes(item.tipo_pregunta)
      ) {
        errores.push({
          fila,
          enunciado: item.enunciado,
          motivo: "Tipo de pregunta inválido.",
        });
        return;
      }
      try {
        AcademicoService.#validarOpcionesBulkLegacy(
          item.tipo_pregunta,
          item.opciones || [],
        );
      } catch (e) {
        errores.push({
          fila,
          enunciado: item.enunciado,
          motivo: e.message.replace("VALIDACION: ", ""),
        });
        return;
      }

      const clave = item.enunciado.trim().toLowerCase();
      if (enunciadosExistentes.has(clave)) {
        if (!forzarDuplicados) {
          omitidas.push({ fila, enunciado: item.enunciado });
          return;
        }
      }

      aInsertar.push({ ...item, id_materia });
    });

    if (omitidas.length > 0 && !forzarDuplicados) {
      return { insertadas: 0, omitidas, errores, requiereConfirmacion: true };
    }

    if (aInsertar.length === 0) {
      return { insertadas: 0, omitidas, errores, requiereConfirmacion: false };
    }

    const t = await sequelize.transaction();
    let insertadas = 0;

    try {
      for (const item of aInsertar) {
        const pregunta = await BancoPregunta.create(
          AcademicoService.#buildPreguntaDTO(item),
          { transaction: t },
        );

        const opcionesDTO = item.opciones.map((o) =>
          AcademicoService.#buildOpcionDTO(o, pregunta.id_pregunta),
        );

        await OpcionRespuesta.bulkCreate(opcionesDTO, {
          transaction: t,
          returning: false,
        });

        insertadas++;
      }

      await t.commit();
      return { insertadas, omitidas: [], errores, requiereConfirmacion: false };
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
}
