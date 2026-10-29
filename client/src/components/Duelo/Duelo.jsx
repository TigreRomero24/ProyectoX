import { useMemo, useState } from "react";
import { useDuelo } from "../../hooks/useDuelo";
import { useAuth } from "../../hooks/useAuth";
import DueloLobby from "./DueloLobby";
import DueloSala from "./DueloSala";
import DueloJuego from "./DueloJuego";
import DueloResultados from "./DueloResultados";
import DueloMusica from "./DueloMusica";
import "./Duelo.css";

export default function Duelo() {
  const duelo = useDuelo();
  const { user } = useAuth();
  const [codigoActivo, setCodigoActivo] = useState(null);

  const esCreador = useMemo(
    () => duelo.participantes.some((p) => p.id_usuario === user?.id && p.es_creador),
    [duelo.participantes, user?.id],
  );

  const handleUnirse = async (codigo) => {
    await duelo.conectarYUnirse(codigo);
    setCodigoActivo(codigo.toUpperCase());
  };

  const handleSalir = () => {
    duelo.salir();
    setCodigoActivo(null);
  };

  const conectado = codigoActivo && duelo.fase !== duelo.FASE.DESCONECTADO;

  let vista;
  if (!conectado) {
    vista = (
      <DueloLobby
        onUnirse={handleUnirse}
        conectando={duelo.conectando}
        error={duelo.errorConexion}
      />
    );
  } else if (duelo.fase === duelo.FASE.SALA) {
    vista = (
      <DueloSala
        codigo={codigoActivo}
        participantes={duelo.participantes}
        onMarcarListo={duelo.marcarListo}
        onIniciar={duelo.iniciarDuelo}
        onSalir={handleSalir}
      />
    );
  } else if (duelo.fase === duelo.FASE.EN_CURSO) {
    vista = (
      <DueloJuego
        pregunta={duelo.pregunta}
        progreso={duelo.progreso}
        onResponder={duelo.responder}
      />
    );
  } else if (duelo.fase === duelo.FASE.FINALIZADO) {
    vista = <DueloResultados ranking={duelo.ranking} onSalir={handleSalir} />;
  }

  return (
    <>
      {vista}
      {conectado && (
        <DueloMusica
          youtubeVideoId={duelo.musicaId}
          esCreador={esCreador}
          onCambiarMusica={duelo.actualizarMusica}
        />
      )}
    </>
  );
}
