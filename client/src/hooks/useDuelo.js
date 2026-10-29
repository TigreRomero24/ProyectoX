import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./useAuth";

const FASE = {
  DESCONECTADO: "desconectado",
  SALA: "sala",
  EN_CURSO: "en_curso",
  FINALIZADO: "finalizado",
};

/**
 * Encapsula el ciclo de vida completo de un duelo en tiempo real:
 * conexión al namespace /duelo, sala de espera, preguntas y ranking final.
 */
export function useDuelo() {
  const { token } = useAuth();
  const socketRef = useRef(null);

  const [conectando, setConectando] = useState(false);
  const [errorConexion, setErrorConexion] = useState("");
  const [fase, setFase] = useState(FASE.DESCONECTADO);

  const [participantes, setParticipantes] = useState([]);
  const [pregunta, setPregunta] = useState(null);
  const [progreso, setProgreso] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [musicaId, setMusicaId] = useState(null);

  const desconectar = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setFase(FASE.DESCONECTADO);
    setParticipantes([]);
    setPregunta(null);
    setProgreso(null);
    setRanking(null);
    setMusicaId(null);
  }, []);

  useEffect(() => () => desconectar(), [desconectar]);

  const conectarYUnirse = useCallback(
    (codigo) =>
      new Promise((resolve, reject) => {
        if (!token) {
          reject(new Error("No hay sesión activa."));
          return;
        }

        setConectando(true);
        setErrorConexion("");

        socketRef.current?.disconnect();
        const socket = io("/duelo", {
          // Callback: en cada reconexión toma el token vigente (el refresh lo renueva).
          auth: (cb) => cb({ token: localStorage.getItem("token") || token }),
          transports: ["websocket"],
        });
        socketRef.current = socket;

        let unido = false;
        socket.on("connect_error", (err) => {
          // Ya dentro del duelo, socket.io reintenta solo; no se corta.
          if (unido) return;
          setConectando(false);
          setErrorConexion(err.message || "No se pudo conectar al duelo.");
          socket.disconnect();
          reject(err);
        });

        socket.on("duelo:cancelado", () => {
          desconectar();
          setErrorConexion("El creador abandonó la sala; el duelo se canceló.");
        });

        socket.on("duelo:participantes", (data) => {
          setParticipantes(data.participantes);
          setMusicaId(data.youtube_video_id || null);
          if (data.estado === "ESPERANDO") setFase(FASE.SALA);
        });

        socket.on("duelo:musica", (data) => setMusicaId(data.youtube_video_id || null));

        socket.on("duelo:iniciado", () => setFase(FASE.EN_CURSO));

        socket.on("duelo:pregunta", (data) => {
          setProgreso(null);
          setPregunta(data);
          setFase(FASE.EN_CURSO);
        });

        socket.on("duelo:progreso", (data) => setProgreso(data));

        socket.on("duelo:finalizado", (data) => {
          setRanking(data.ranking);
          setPregunta(null);
          setFase(FASE.FINALIZADO);
        });

        socket.on("connect", () => {
          socket.emit("duelo:unirse", { codigo }, (res) => {
            setConectando(false);
            if (res?.ok) {
              unido = true;
              resolve();
            } else {
              setErrorConexion(res?.error || "No se pudo unir al duelo.");
              socket.disconnect();
              reject(new Error(res?.error));
            }
          });
        });
      }),
    [token, desconectar],
  );

  const marcarListo = useCallback((listo) => {
    socketRef.current?.emit("duelo:listo", { listo });
  }, []);

  const iniciarDuelo = useCallback(
    () =>
      new Promise((resolve, reject) => {
        socketRef.current?.emit("duelo:iniciar", {}, (res) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || "No se pudo iniciar el duelo."));
        });
      }),
    [],
  );

  const responder = useCallback(
    (id_pregunta, id_opcion_elegida) =>
      new Promise((resolve) => {
        socketRef.current?.emit(
          "duelo:responder",
          { id_pregunta, id_opcion_elegida },
          (res) => resolve(res),
        );
      }),
    [],
  );

  const salir = useCallback(() => {
    socketRef.current?.emit("duelo:salir", {}, () => desconectar());
  }, [desconectar]);

  const actualizarMusica = useCallback(
    (youtube_url) =>
      new Promise((resolve, reject) => {
        socketRef.current?.emit("duelo:musica", { youtube_url }, (res) => {
          if (res?.ok) resolve(res.youtube_video_id);
          else reject(new Error(res?.error || "No se pudo actualizar la música."));
        });
      }),
    [],
  );

  return {
    FASE,
    fase,
    conectando,
    errorConexion,
    participantes,
    pregunta,
    progreso,
    ranking,
    musicaId,
    conectarYUnirse,
    marcarListo,
    iniciarDuelo,
    responder,
    salir,
    desconectar,
    actualizarMusica,
  };
}
