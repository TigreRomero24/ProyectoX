import { Duelo } from "../models/duelo.models/duelo.js";
import { DueloParticipante } from "../models/duelo.models/dueloParticipante.js";
import { DueloRespuesta } from "../models/duelo.models/dueloRespuesta.js";
import { Materia } from "../models/academico.models/materia.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Usuario } from "../models/security.models/usuarioModel.js";
import { Inscripcion } from "../models/academico.models/inscripcion.js";
import { PersonajeService } from "./personaje.service.js";

const MIN_PREGUNTAS_MATERIA = 4;
const PUNTOS_BASE = 1000;
const PUNTOS_MINIMOS_ACIERTO = 100;
// El duelo solo califica preguntas de una única opción correcta.
const TIPOS_DUELO = ["MULTIPLE", "VERDADERO_FALSO"];
const CODIGO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin caracteres ambiguos (0,O,1,I)

export class DueloService {
  static #mezclarArreglo(arreglo) {
    const copia = [...arreglo];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  static async #verificarInscripcion(id_usuario, id_materia, rol) {
    if (rol === "ADMINISTRADOR") return;
    const inscrito = await Inscripcion.findOne({
      where: { id_usuario, id_materia, activo: true },
      attributes: ["id_usuario"],
    });
    if (!inscrito) {
      throw new Error("RESTRICCION: No estás inscrito en la materia de este duelo.");
    }
  }

  static #generarCodigo() {
    let codigo = "";
    for (let i = 0; i < 6; i++) {
      codigo += CODIGO_CHARS[Math.floor(Math.random() * CODIGO_CHARS.length)];
    }
    return codigo;
  }

  /**
   * Acepta un link de YouTube en cualquiera de sus formatos comunes
   * (watch?v=, youtu.be/, embed/, shorts/) o directamente un ID de 11
   * caracteres, y devuelve solo el ID. Si no reconoce nada válido, null.
   */
  static extraerYoutubeId(entrada) {
    if (!entrada || typeof entrada !== "string") return null;
    const texto = entrada.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(texto)) return texto;

    const patrones = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const patron of patrones) {
      const match = texto.match(patron);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Calcula los puntos de una respuesta según velocidad.
   * Correcta e inmediata → cerca de PUNTOS_BASE.
   * Correcta al filo del tiempo límite → PUNTOS_MINIMOS_ACIERTO.
   * Incorrecta o sin responder → 0.
   */
  static calcularPuntos(esCorrecta, tiempoRespuestaMs, tiempoLimiteMs) {
    if (!esCorrecta) return 0;
    const tiempo = Math.min(Math.max(tiempoRespuestaMs ?? tiempoLimiteMs, 0), tiempoLimiteMs);
    const proporcionRestante = 1 - tiempo / tiempoLimiteMs;
    const puntos = Math.round(
      PUNTOS_MINIMOS_ACIERTO + (PUNTOS_BASE - PUNTOS_MINIMOS_ACIERTO) * proporcionRestante,
    );
    return Math.min(PUNTOS_BASE, Math.max(PUNTOS_MINIMOS_ACIERTO, puntos));
  }

  // ─── Crear / unirse ──────────────────────────────────────────────────────────

  static async crearDuelo(id_creador, datos, rol) {
    const id_materia = parseInt(datos.id_materia, 10);
    if (!id_materia || id_materia <= 0) {
      throw new Error("VALIDACION: id_materia inválido.");
    }

    const materia = await Materia.findByPk(id_materia);
    if (!materia) {
      throw new Error("NO_ENCONTRADO: La materia indicada no existe.");
    }
    await DueloService.#verificarInscripcion(id_creador, id_materia, rol);

    const totalPreguntas = await BancoPregunta.count({
      where: { id_materia, activo: true, tipo_pregunta: TIPOS_DUELO },
    });
    if (totalPreguntas < MIN_PREGUNTAS_MATERIA) {
      throw new Error(
        `RESTRICCION: La materia necesita al menos ${MIN_PREGUNTAS_MATERIA} preguntas activas de opción única (múltiple o V/F) para un duelo.`,
      );
    }

    const cantidad_preguntas = Math.min(
      Math.max(parseInt(datos.cantidad_preguntas, 10) || 10, 1),
      Math.min(totalPreguntas, 30),
    );

    const max_participantes = Math.min(
      Math.max(parseInt(datos.max_participantes, 10) || 10, 2),
      10,
    );

    const tiempo_por_pregunta_ms = Math.min(
      Math.max(parseInt(datos.tiempo_por_pregunta_ms, 10) || 20000, 5000),
      60000,
    );

    const youtube_video_id = DueloService.extraerYoutubeId(datos.youtube_url);

    // Reintenta si el código generado ya existe (muy improbable, pero es una unicidad real).
    let duelo = null;
    for (let intento = 0; intento < 5 && !duelo; intento++) {
      try {
        duelo = await Duelo.create({
          codigo: DueloService.#generarCodigo(),
          id_materia,
          id_creador,
          cantidad_preguntas,
          max_participantes,
          tiempo_por_pregunta_ms,
          youtube_video_id,
        });
      } catch (error) {
        if (error.name !== "SequelizeUniqueConstraintError") throw error;
      }
    }
    if (!duelo) {
      throw new Error("VALIDACION: No se pudo generar un código único, intenta de nuevo.");
    }

    await DueloParticipante.create({
      id_duelo: duelo.id_duelo,
      id_usuario: id_creador,
      listo: true, // el creador ya está listo por defecto
    });

    return DueloService.obtenerDueloPorCodigo(duelo.codigo);
  }

  static async obtenerDueloPorCodigo(codigo) {
    const duelo = await Duelo.findOne({
      where: { codigo: String(codigo).toUpperCase() },
      include: [
        { model: Materia, attributes: ["id_materia", "nombre"] },
        {
          model: DueloParticipante,
          as: "participantes",
          include: [{ model: Usuario, as: "usuario", attributes: ["id_usuario", "nombre", "url_foto"] }],
        },
      ],
    });
    if (!duelo) {
      throw new Error("NO_ENCONTRADO: No existe un duelo con ese código.");
    }
    return duelo;
  }

  static async #obtenerDueloOrFallar(id_duelo) {
    const duelo = await Duelo.findByPk(id_duelo);
    if (!duelo) throw new Error("NO_ENCONTRADO: El duelo no existe.");
    return duelo;
  }

  static async unirseDuelo(codigo, id_usuario, rol) {
    const duelo = await DueloService.obtenerDueloPorCodigo(codigo);

    // Reingreso (ej. reconexión): permitido también con el duelo en curso.
    const yaParticipa = duelo.participantes.some((p) => p.id_usuario === id_usuario);
    if (yaParticipa && ["ESPERANDO", "EN_CURSO"].includes(duelo.estado)) {
      return duelo;
    }

    if (duelo.estado !== "ESPERANDO") {
      throw new Error("ESTADO_INVALIDO: El duelo ya inició o finalizó.");
    }

    await DueloService.#verificarInscripcion(id_usuario, duelo.id_materia, rol);

    if (duelo.participantes.length >= duelo.max_participantes) {
      throw new Error("RESTRICCION: La sala de duelo está llena.");
    }

    await DueloParticipante.create({ id_duelo: duelo.id_duelo, id_usuario });

    return DueloService.obtenerDueloPorCodigo(codigo);
  }

  static async marcarListo(id_duelo, id_usuario, listo) {
    const participante = await DueloParticipante.findOne({
      where: { id_duelo, id_usuario },
    });
    if (!participante) {
      throw new Error("NO_ENCONTRADO: No participas en este duelo.");
    }
    participante.listo = !!listo;
    await participante.save();
    return participante;
  }

  static async actualizarMusica(id_duelo, id_usuario, youtube_url) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    if (duelo.id_creador !== id_usuario) {
      throw new Error("RESTRICCION: Solo el creador puede configurar la música.");
    }

    // youtube_url vacío/null = quitar la música
    duelo.youtube_video_id = youtube_url ? DueloService.extraerYoutubeId(youtube_url) : null;
    if (youtube_url && !duelo.youtube_video_id) {
      throw new Error("VALIDACION: El link de YouTube no es válido.");
    }
    await duelo.save();
    return duelo.youtube_video_id;
  }

  static async marcarConexion(id_duelo, id_usuario, conectado) {
    await DueloParticipante.update(
      { conectado },
      { where: { id_duelo, id_usuario } },
    );
  }

  // ─── Ciclo de juego ──────────────────────────────────────────────────────────

  static async iniciarDuelo(id_duelo, id_usuario) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);

    if (duelo.id_creador !== id_usuario) {
      throw new Error("RESTRICCION: Solo el creador puede iniciar el duelo.");
    }
    if (duelo.estado !== "ESPERANDO") {
      throw new Error("ESTADO_INVALIDO: El duelo ya inició o finalizó.");
    }

    const participantes = await DueloParticipante.findAll({ where: { id_duelo } });
    if (participantes.length < 2) {
      throw new Error("RESTRICCION: Se necesitan al menos 2 participantes para iniciar.");
    }
    if (participantes.some((p) => !p.listo)) {
      throw new Error("RESTRICCION: Todos los participantes deben marcarse como listos.");
    }

    const preguntasDisponibles = await BancoPregunta.findAll({
      where: { id_materia: duelo.id_materia, activo: true, tipo_pregunta: TIPOS_DUELO },
      attributes: ["id_pregunta"],
    });
    const idsElegidos = DueloService.#mezclarArreglo(
      preguntasDisponibles.map((p) => p.id_pregunta),
    ).slice(0, duelo.cantidad_preguntas);

    duelo.preguntas_ids = idsElegidos;
    duelo.estado = "EN_CURSO";
    duelo.pregunta_actual = 0;
    duelo.fecha_inicio = new Date();
    await duelo.save();

    return duelo;
  }

  /**
   * Devuelve la pregunta actual lista para enviar por socket, sin exponer
   * cuál opción es la correcta.
   */
  static async obtenerPreguntaActual(id_duelo) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    if (duelo.estado !== "EN_CURSO") {
      throw new Error("ESTADO_INVALIDO: El duelo no está en curso.");
    }

    const idPregunta = duelo.preguntas_ids[duelo.pregunta_actual];
    if (!idPregunta) {
      throw new Error("NO_ENCONTRADO: No hay una pregunta activa.");
    }

    const pregunta = await BancoPregunta.findByPk(idPregunta, {
      include: [{ model: OpcionRespuesta, as: "opciones" }],
    });

    return {
      numero: duelo.pregunta_actual + 1,
      total: duelo.preguntas_ids.length,
      id_pregunta: pregunta.id_pregunta,
      enunciado: pregunta.enunciado,
      url_imagen: pregunta.url_imagen,
      tipo_pregunta: pregunta.tipo_pregunta,
      tiempo_limite_ms: duelo.tiempo_por_pregunta_ms,
      opciones: DueloService.#mezclarArreglo(
        pregunta.opciones.map((o) => ({ id_opcion: o.id_opcion, texto: o.texto })),
      ),
    };
  }

  static async registrarRespuesta(id_duelo, id_usuario, { id_pregunta, id_opcion_elegida, tiempo_respuesta_ms }) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    if (duelo.estado !== "EN_CURSO") {
      throw new Error("ESTADO_INVALIDO: El duelo no está en curso.");
    }
    const idPreguntaActual = duelo.preguntas_ids[duelo.pregunta_actual];
    if (idPreguntaActual !== id_pregunta) {
      throw new Error("ESTADO_INVALIDO: Esa pregunta ya no está activa.");
    }

    // Idempotencia: si ya respondió esta pregunta, no se vuelve a calificar.
    const yaRespondio = await DueloRespuesta.findOne({
      where: { id_duelo, id_usuario, id_pregunta },
    });
    if (yaRespondio) return yaRespondio;

    let esCorrecta = false;
    if (id_opcion_elegida) {
      const opcion = await OpcionRespuesta.findOne({
        where: { id_opcion: id_opcion_elegida, id_pregunta },
      });
      if (!opcion) {
        throw new Error("VALIDACION: La opción no pertenece a la pregunta activa.");
      }
      esCorrecta = opcion.es_correcta;
    }

    const puntos = DueloService.calcularPuntos(
      esCorrecta,
      tiempo_respuesta_ms,
      duelo.tiempo_por_pregunta_ms,
    );

    const respuesta = await DueloRespuesta.create({
      id_duelo,
      id_usuario,
      id_pregunta,
      id_opcion_elegida: id_opcion_elegida || null,
      es_correcta: esCorrecta,
      tiempo_respuesta_ms,
      puntos_obtenidos: puntos,
    });

    await DueloParticipante.increment(
      { puntaje: puntos, respuestas_correctas: esCorrecta ? 1 : 0 },
      { where: { id_duelo, id_usuario } },
    );

    return respuesta;
  }

  /**
   * Cuenta cuántos participantes conectados ya respondieron la pregunta activa.
   * Útil para que el servidor de sockets decida si avanza antes de tiempo.
   */
  static async contarRespuestasPreguntaActual(id_duelo) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    const idPregunta = duelo.preguntas_ids[duelo.pregunta_actual];
    const [totalParticipantes, totalRespuestas] = await Promise.all([
      DueloParticipante.count({ where: { id_duelo, conectado: true } }),
      DueloRespuesta.count({ where: { id_duelo, id_pregunta: idPregunta } }),
    ]);
    return { totalParticipantes, totalRespuestas, indice: duelo.pregunta_actual };
  }

  /**
   * Avanza desde `desdeIndice` a la siguiente pregunta, o finaliza si era la
   * última. El UPDATE condicionado al índice hace que, si el temporizador y la
   * última respuesta llegan a la vez, solo uno avance (el otro sale con
   * omitido: true). Devuelve { finalizado, omitido }.
   */
  static async avanzarPregunta(id_duelo, desdeIndice) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);

    if (desdeIndice + 1 >= duelo.preguntas_ids.length) {
      const finalizado = await DueloService.finalizarDuelo(id_duelo, desdeIndice);
      return { finalizado, omitido: !finalizado };
    }

    const [actualizados] = await Duelo.update(
      { pregunta_actual: desdeIndice + 1 },
      { where: { id_duelo, estado: "EN_CURSO", pregunta_actual: desdeIndice } },
    );
    return { finalizado: false, omitido: actualizados === 0 };
  }

  /** Finaliza y reparte monedas una sola vez. Devuelve true si este llamado lo finalizó. */
  static async finalizarDuelo(id_duelo, desdeIndice) {
    const [actualizados] = await Duelo.update(
      { estado: "FINALIZADO", fecha_fin: new Date() },
      { where: { id_duelo, estado: "EN_CURSO", pregunta_actual: desdeIndice } },
    );
    if (actualizados === 0) return false;

    const ranking = await DueloService.obtenerRanking(id_duelo);

    // Monedas por posición: no bloquea la respuesta si falla.
    const MONEDAS_POR_POSICION = { 1: 100, 2: 60, 3: 40 };
    for (const p of ranking) {
      const monedas = MONEDAS_POR_POSICION[p.posicion] ?? 20;
      try {
        await PersonajeService.otorgarMonedas(p.id_usuario, monedas);
      } catch (error) {
        console.error("[DueloService] No se pudieron otorgar monedas:", error.message);
      }
    }

    return true;
  }

  static async obtenerRanking(id_duelo) {
    const participantes = await DueloParticipante.findAll({
      where: { id_duelo },
      include: [{ model: Usuario, as: "usuario", attributes: ["id_usuario", "nombre", "url_foto"] }],
      order: [
        ["puntaje", "DESC"],
        ["respuestas_correctas", "DESC"],
      ],
    });

    return participantes.map((p, index) => ({
      posicion: index + 1,
      id_usuario: p.id_usuario,
      nombre: p.usuario?.nombre || "Estudiante",
      url_foto: p.usuario?.url_foto || null,
      puntaje: p.puntaje,
      respuestas_correctas: p.respuestas_correctas,
    }));
  }

  static async abandonarDuelo(id_duelo, id_usuario) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);

    if (duelo.estado === "ESPERANDO") {
      await DueloParticipante.destroy({ where: { id_duelo, id_usuario } });
      // Sin el creador nadie puede iniciarlo; sin nadie, no tiene sentido.
      const restantes = await DueloParticipante.count({ where: { id_duelo } });
      if (restantes === 0 || duelo.id_creador === id_usuario) {
        duelo.estado = "CANCELADO";
        await duelo.save();
      }
      return { cancelado: duelo.estado === "CANCELADO" };
    }

    await DueloService.marcarConexion(id_duelo, id_usuario, false);
    return { cancelado: false };
  }
}
