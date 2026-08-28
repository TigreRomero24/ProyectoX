import { env } from "../config/environment.js";
import { TokenFactory } from "../utils/tokenFactory.js";
import { SesionDispositivo } from "../models/security.models/sessionModel.js";
import { Usuario } from "../models/security.models/usuarioModel.js";
import { DueloService } from "../services/duelo.service.js";

// Buffer de red: tiempo extra que el servidor espera antes de forzar el
// avance de pregunta, para absorber la latencia de la última respuesta.
const BUFFER_RED_MS = 800;

// Temporizadores de auto-avance en memoria, uno por duelo activo.
// (Si el proceso Node se reinicia, los duelos EN_CURSO quedan huérfanos;
// es una limitación aceptada de un MVP en memoria de un solo proceso.)
const temporizadores = new Map();

const limpiarTemporizador = (id_duelo) => {
  const t = temporizadores.get(id_duelo);
  if (t) {
    clearTimeout(t);
    temporizadores.delete(id_duelo);
  }
};

export function setupDueloSocket(io) {
  const nsp = io.of("/duelo");

  // ── Autenticación del socket (equivalente a AuthMiddleware + SessionMiddleware) ──
  nsp.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("TOKEN_REQUERIDO"));

      const accessFactory = TokenFactory.create("ACCESS", env.jwt);
      const decoded = accessFactory.verifyToken(token);

      const sesionActiva = await SesionDispositivo.findOne({
        where: { id_usuario: decoded.id, dispositivo_id: decoded.dispositivoId },
        include: [{ model: Usuario, as: "propietario", attributes: ["activo"] }],
      });
      if (!sesionActiva || !sesionActiva.propietario.activo) {
        return next(new Error("SESION_REVOCADA"));
      }

      socket.user = decoded; // { id, rol, nombre, correo, url_foto }
      next();
    } catch {
      next(new Error("TOKEN_INVALIDO"));
    }
  });

  const emitirParticipantes = async (codigo) => {
    const duelo = await DueloService.obtenerDueloPorCodigo(codigo);
    nsp.to(codigo).emit("duelo:participantes", {
      estado: duelo.estado,
      participantes: duelo.participantes.map((p) => ({
        id_usuario: p.id_usuario,
        nombre: p.usuario?.nombre || "Estudiante",
        url_foto: p.usuario?.url_foto || null,
        listo: p.listo,
        conectado: p.conectado,
        es_creador: p.id_usuario === duelo.id_creador,
      })),
    });
    return duelo;
  };

  const emitirPreguntaActual = async (codigo, id_duelo) => {
    const pregunta = await DueloService.obtenerPreguntaActual(id_duelo);
    nsp.to(codigo).emit("duelo:pregunta", pregunta);

    limpiarTemporizador(id_duelo);
    const timeout = setTimeout(
      () => avanzar(codigo, id_duelo).catch((err) => console.error("[DueloSocket] auto-avance:", err.message)),
      pregunta.tiempo_limite_ms + BUFFER_RED_MS,
    );
    temporizadores.set(id_duelo, timeout);
  };

  const avanzar = async (codigo, id_duelo) => {
    limpiarTemporizador(id_duelo);
    const { finalizado } = await DueloService.avanzarPregunta(id_duelo);

    if (finalizado) {
      const ranking = await DueloService.obtenerRanking(id_duelo);
      nsp.to(codigo).emit("duelo:finalizado", { ranking });
      return;
    }

    await emitirPreguntaActual(codigo, id_duelo);
  };

  nsp.on("connection", (socket) => {
    // ── Unirse a la sala ────────────────────────────────────────────────────
    socket.on("duelo:unirse", async ({ codigo }, ack) => {
      try {
        const duelo = await DueloService.unirseDuelo(codigo, socket.user.id);
        await DueloService.marcarConexion(duelo.id_duelo, socket.user.id, true);

        socket.join(codigo);
        socket.data.codigo = codigo;
        socket.data.id_duelo = duelo.id_duelo;

        await emitirParticipantes(codigo);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    // ── Marcar listo / no listo en la sala de espera ───────────────────────
    socket.on("duelo:listo", async ({ listo }, ack) => {
      try {
        const { codigo, id_duelo } = socket.data;
        if (!codigo) throw new Error("ESTADO_INVALIDO: No estás en una sala.");
        await DueloService.marcarListo(id_duelo, socket.user.id, listo);
        await emitirParticipantes(codigo);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    // ── El creador inicia el duelo ──────────────────────────────────────────
    socket.on("duelo:iniciar", async (_payload, ack) => {
      try {
        const { codigo, id_duelo } = socket.data;
        if (!codigo) throw new Error("ESTADO_INVALIDO: No estás en una sala.");

        await DueloService.iniciarDuelo(id_duelo, socket.user.id);
        nsp.to(codigo).emit("duelo:iniciado");
        await emitirPreguntaActual(codigo, id_duelo);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    // ── Responder la pregunta activa ────────────────────────────────────────
    socket.on("duelo:responder", async ({ id_pregunta, id_opcion_elegida, tiempo_respuesta_ms }, ack) => {
      try {
        const { codigo, id_duelo } = socket.data;
        if (!codigo) throw new Error("ESTADO_INVALIDO: No estás en una sala.");

        const respuesta = await DueloService.registrarRespuesta(id_duelo, socket.user.id, {
          id_pregunta,
          id_opcion_elegida,
          tiempo_respuesta_ms,
        });

        ack?.({
          ok: true,
          es_correcta: respuesta.es_correcta,
          puntos_obtenidos: respuesta.puntos_obtenidos,
        });

        // Progreso en vivo (para mostrar "3/6 ya respondieron")
        const { totalParticipantes, totalRespuestas } =
          await DueloService.contarRespuestasPreguntaActual(id_duelo);
        nsp.to(codigo).emit("duelo:progreso", { totalParticipantes, totalRespuestas });

        // Si ya respondieron todos los conectados, no hace falta esperar el timer.
        if (totalRespuestas >= totalParticipantes) {
          await avanzar(codigo, id_duelo);
        }
      } catch (error) {
        ack?.({ ok: false, error: error.message });
      }
    });

    // ── Salir / cerrar conexión ──────────────────────────────────────────────
    const salir = async () => {
      const { codigo, id_duelo } = socket.data;
      if (!codigo || !id_duelo) return;
      try {
        await DueloService.marcarConexion(id_duelo, socket.user.id, false);
        await emitirParticipantes(codigo);
      } catch (error) {
        console.error("[DueloSocket] al salir:", error.message);
      }
    };

    socket.on("duelo:salir", async (_payload, ack) => {
      await salir();
      socket.leave(socket.data.codigo);
      ack?.({ ok: true });
    });

    socket.on("disconnect", salir);
  });

  return nsp;
}
