import { useEffect, useState } from "react";
import { Swords, Users, Hash, Loader2, AlertCircle, Plus, LogIn } from "lucide-react";
import { api } from "../../services/api";

const TAB = { CREAR: "crear", UNIRSE: "unirse" };

export default function DueloLobby({ onUnirse, conectando, error }) {
  const [tab, setTab] = useState(TAB.CREAR);

  const [materias, setMaterias] = useState([]);
  const [cargandoMaterias, setCargandoMaterias] = useState(true);
  const [idMateria, setIdMateria] = useState("");
  const [cantidadPreguntas, setCantidadPreguntas] = useState(10);
  const [maxParticipantes, setMaxParticipantes] = useState(10);
  const [tiempoSegundos, setTiempoSegundos] = useState(20);

  const [codigoInput, setCodigoInput] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    api
      .getMisMaterias()
      .then((res) => {
        setMaterias(res.data || []);
        if (res.data?.length) setIdMateria(String(res.data[0].id_materia));
      })
      .catch(() => setErrorLocal("No se pudieron cargar tus materias."))
      .finally(() => setCargandoMaterias(false));
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();
    setErrorLocal("");
    if (!idMateria) {
      setErrorLocal("Selecciona una materia.");
      return;
    }
    setCreando(true);
    try {
      const res = await api.crearDuelo({
        id_materia: Number(idMateria),
        cantidad_preguntas: Number(cantidadPreguntas),
        max_participantes: Number(maxParticipantes),
        tiempo_por_pregunta_ms: Number(tiempoSegundos) * 1000,
      });
      await onUnirse(res.data.codigo);
    } catch (err) {
      setErrorLocal(err.message);
    } finally {
      setCreando(false);
    }
  };

  const handleUnirse = async (e) => {
    e.preventDefault();
    setErrorLocal("");
    if (codigoInput.trim().length < 4) {
      setErrorLocal("Ingresa un código válido.");
      return;
    }
    try {
      await onUnirse(codigoInput.trim());
    } catch (err) {
      setErrorLocal(err.message);
    }
  };

  const errorVisible = errorLocal || error;

  return (
    <div className="duelo-lobby">
      <div className="duelo-lobby-header">
        <div className="duelo-lobby-icon"><Swords size={22} /></div>
        <div>
          <h2>Duelo de batalla</h2>
          <p>Compite en tiempo real respondiendo más rápido que tus compañeros.</p>
        </div>
      </div>

      <div className="duelo-tabs">
        <button
          className={`duelo-tab${tab === TAB.CREAR ? " active" : ""}`}
          onClick={() => setTab(TAB.CREAR)}
        >
          <Plus size={15} /> Crear sala
        </button>
        <button
          className={`duelo-tab${tab === TAB.UNIRSE ? " active" : ""}`}
          onClick={() => setTab(TAB.UNIRSE)}
        >
          <LogIn size={15} /> Unirme con código
        </button>
      </div>

      {errorVisible && (
        <div className="duelo-alert duelo-alert--error">
          <AlertCircle size={16} /> {errorVisible}
        </div>
      )}

      {tab === TAB.CREAR ? (
        <form className="duelo-form" onSubmit={handleCrear}>
          <label>
            Materia
            {cargandoMaterias ? (
              <div className="duelo-skeleton" />
            ) : (
              <select value={idMateria} onChange={(e) => setIdMateria(e.target.value)}>
                {materias.map((m) => (
                  <option key={m.id_materia} value={m.id_materia}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </label>

          <div className="duelo-form-row">
            <label>
              Nº de preguntas
              <input
                type="number"
                min={1}
                max={30}
                value={cantidadPreguntas}
                onChange={(e) => setCantidadPreguntas(e.target.value)}
              />
            </label>
            <label>
              Tiempo por pregunta (s)
              <input
                type="number"
                min={5}
                max={60}
                value={tiempoSegundos}
                onChange={(e) => setTiempoSegundos(e.target.value)}
              />
            </label>
            <label>
              <Users size={13} /> Máx. participantes
              <input
                type="number"
                min={2}
                max={10}
                value={maxParticipantes}
                onChange={(e) => setMaxParticipantes(e.target.value)}
              />
            </label>
          </div>

          <button className="duelo-btn duelo-btn--primary" type="submit" disabled={creando || conectando}>
            {creando || conectando ? <Loader2 size={16} className="duelo-spin" /> : <Swords size={16} />}
            Crear duelo
          </button>
        </form>
      ) : (
        <form className="duelo-form" onSubmit={handleUnirse}>
          <label>
            <Hash size={13} /> Código de la sala
            <input
              type="text"
              maxLength={6}
              placeholder="Ej: K3F9A1"
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
              className="duelo-input-codigo"
            />
          </label>

          <button className="duelo-btn duelo-btn--primary" type="submit" disabled={conectando}>
            {conectando ? <Loader2 size={16} className="duelo-spin" /> : <LogIn size={16} />}
            Unirme
          </button>
        </form>
      )}
    </div>
  );
}
