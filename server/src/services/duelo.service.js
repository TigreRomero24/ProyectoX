import { Duelo } from "../models/duelo.models/duelo.js";
import { DueloParticipante } from "../models/duelo.models/dueloParticipante.js";
import { DueloRespuesta } from "../models/duelo.models/dueloRespuesta.js";
import { Materia } from "../models/academico.models/materia.js";
import { BancoPregunta } from "../models/academico.models/bancoPregunta.js";
import { OpcionRespuesta } from "../models/academico.models/opcionRespuesta.js";
import { Usuario } from "../models/security.models/usuarioModel.js";

const MIN_PREGUNTAS_MATERIA = 4;
const PUNTOS_BASE = 1000;
const PUNTOS_MINIMOS_ACIERTO = 100;
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

  static #generarCodigo() {
    let codigo = "";
    for (let i = 0; i < 6; i++) {
      codigo += CODIGO_CHARS[Math.floor(Math.random() * CODIGO_CHARS.length)];
    }
    return codigo;
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

  static async crearDuelo(id_creador, datos) {
    const id_materia = parseInt(datos.id_materia, 10);
    if (!id_materia || id_materia <= 0) {
      throw new Error("VALIDACION: id_materia inválido.");
    }

    const materia = await Materia.findByPk(id_materia);
    if (!materia) {
      throw new Error("NO_ENCONTRADO: La materia indicada no existe.");
    }

    const totalPreguntas = await BancoPregunta.count({
      where: { id_materia, activo: true },
    });
    if (totalPreguntas < MIN_PREGUNTAS_MATERIA) {
      throw new Error(
        `RESTRICCION: La materia necesita al menos ${MIN_PREGUNTAS_MATERIA} preguntas activas para un duelo.`,
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

  static async unirseDuelo(codigo, id_usuario) {
    const duelo = await DueloService.obtenerDueloPorCodigo(codigo);

    if (duelo.estado !== "ESPERANDO") {
      throw new Error("ESTADO_INVALIDO: El duelo ya inició o finalizó.");
    }

    const yaParticipa = duelo.participantes.some((p) => p.id_usuario === id_usuario);
    if (yaParticipa) {
      return duelo; // reingreso (ej. reconexión) — no es un error
    }

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
      where: { id_materia: duelo.id_materia, activo: true },
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
    return { totalParticipantes, totalRespuestas };
  }

  /**
   * Avanza a la siguiente pregunta. Si ya no quedan, finaliza el duelo.
   * Devuelve { finalizado: boolean, duelo }.
   */
  static async avanzarPregunta(id_duelo) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    const siguienteIndice = duelo.pregunta_actual + 1;

    if (siguienteIndice >= duelo.preguntas_ids.length) {
      await DueloService.finalizarDuelo(id_duelo);
      return { finalizado: true, duelo };
    }

    duelo.pregunta_actual = siguienteIndice;
    await duelo.save();
    return { finalizado: false, duelo };
  }

  static async finalizarDuelo(id_duelo) {
    const duelo = await DueloService.#obtenerDueloOrFallar(id_duelo);
    if (duelo.estado === "FINALIZADO") return DueloService.obtenerRanking(id_duelo);

    duelo.estado = "FINALIZADO";
    duelo.fecha_fin = new Date();
    await duelo.save();

    return DueloService.obtenerRanking(id_duelo);
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
      // Si el creador se va antes de iniciar y no queda nadie, se cancela.
      const restantes = await DueloParticipante.count({ where: { id_duelo } });
      if (restantes === 0) {
        duelo.estado = "CANCELADO";
        await duelo.save();
      }
      return;
    }

    await DueloService.marcarConexion(id_duelo, id_usuario, false);
  }
}
