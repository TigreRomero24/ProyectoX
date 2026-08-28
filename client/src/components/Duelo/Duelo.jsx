import { useState } from "react";
import { useDuelo } from "../../hooks/useDuelo";
import DueloLobby from "./DueloLobby";
import DueloSala from "./DueloSala";
import DueloJuego from "./DueloJuego";
import DueloResultados from "./DueloResultados";
import "./Duelo.css";

export default function Duelo() {
  const duelo = useDuelo();
  const [codigoActivo, setCodigoActivo] = useState(null);

  const handleUnirse = async (codigo) => {
    await duelo.conectarYUnirse(codigo);
    setCodigoActivo(codigo.toUpperCase());
  };

  const handleSalir = () => {
    duelo.salir();
    setCodigoActivo(null);
  };

  if (!codigoActivo || duelo.fase === duelo.FASE.DESCONECTADO) {
    return (
      <DueloLobby
        onUnirse={handleUnirse}
        conectando={duelo.conectando}
        error={duelo.errorConexion}
      />
    );
  }

  if (duelo.fase === duelo.FASE.SALA) {
    return (
      <DueloSala
        codigo={codigoActivo}
        participantes={duelo.participantes}
        onMarcarListo={duelo.marcarListo}
        onIniciar={duelo.iniciarDuelo}
        onSalir={handleSalir}
      />
    );
  }

  if (duelo.fase === duelo.FASE.EN_CURSO) {
    return (
      <DueloJuego
        pregunta={duelo.pregunta}
        progreso={duelo.progreso}
        participantes={duelo.participantes}
        onResponder={duelo.responder}
      />
    );
  }

  if (duelo.fase === duelo.FASE.FINALIZADO) {
    return <DueloResultados ranking={duelo.ranking} onSalir={handleSalir} />;
  }

  return null;
}
