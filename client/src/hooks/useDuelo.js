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

  const desconectar = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setFase(FASE.DESCONECTADO);
    setParticipantes([]);
    setPregunta(null);
    setProgreso(null);
    setRanking(null);
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

        const socket = io("/duelo", {
          auth: { token },
          transports: ["websocket"],
        });
        socketRef.current = socket;

        socket.on("connect_error", (err) => {
          setConectando(false);
          setErrorConexion(err.message || "No se pudo conectar al duelo.");
          reject(err);
        });

        socket.on("duelo:participantes", (data) => {
          setParticipantes(data.participantes);
          if (data.estado === "ESPERANDO") setFase(FASE.SALA);
        });

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
            if (res?.ok) resolve();
            else {
              setErrorConexion(res?.error || "No se pudo unir al duelo.");
              reject(new Error(res?.error));
            }
          });
        });
      }),
    [token],
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
    (id_pregunta, id_opcion_elegida, tiempo_respuesta_ms) =>
      new Promise((resolve) => {
        socketRef.current?.emit(
          "duelo:responder",
          { id_pregunta, id_opcion_elegida, tiempo_respuesta_ms },
          (res) => resolve(res),
        );
      }),
    [],
  );

  const salir = useCallback(() => {
    socketRef.current?.emit("duelo:salir", {}, () => desconectar());
  }, [desconectar]);

  return {
    FASE,
    fase,
    conectando,
    errorConexion,
    participantes,
    pregunta,
    progreso,
    ranking,
    conectarYUnirse,
    marcarListo,
    iniciarDuelo,
    responder,
    salir,
    desconectar,
  };
}
