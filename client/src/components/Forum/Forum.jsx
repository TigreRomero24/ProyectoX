import { useState } from "react";
import {
  MessageSquare,
  ThumbsUp,
  Clock,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Send,
  User,
} from "lucide-react";
import "./Forum.css";

const CATEGORIAS = [
  "Matemáticas",
  "Física",
  "Historia",
  "Programación",
  "Literatura",
  "Química",
  "Biología",
  "Inglés",
];

const HILOS_INICIALES = [
  {
    id: 1,
    titulo: "¿Cómo resolver integrales por partes?",
    autor: "est_garcia",
    categoria: "Matemáticas",
    fecha: "Hace 2 horas",
    respuestas: 8,
    likes: 12,
    resuelto: true,
    contenido:
      "Tengo dudas sobre cómo aplicar la técnica de integración por partes. ¿Cuándo se usa y cuál es la fórmula correcta?",
  },
  {
    id: 2,
    titulo: "Duda sobre la ley de Ohm en circuitos paralelos",
    autor: "est_rodriguez",
    categoria: "Física",
    fecha: "Hace 4 horas",
    respuestas: 3,
    likes: 5,
    resuelto: false,
    contenido:
      "No entiendo cómo calcular la resistencia total en un circuito paralelo usando la ley de Ohm.",
  },
  {
    id: 3,
    titulo: "Resumen de la Revolución Francesa",
    autor: "est_torres",
    categoria: "Historia",
    fecha: "Hace 1 día",
    respuestas: 15,
    likes: 23,
    resuelto: true,
    contenido:
      "¿Alguien puede ayudarme con los eventos clave de la Revolución Francesa para el examen?",
  },
  {
    id: 4,
    titulo: "¿Diferencia entre variables y constantes en Python?",
    autor: "est_hernandez",
    categoria: "Programación",
    fecha: "Hace 1 día",
    respuestas: 1,
    likes: 2,
    resuelto: false,
    contenido:
      "Estoy aprendiendo Python y no entiendo bien la diferencia entre variables y constantes.",
  },
  {
    id: 5,
    titulo: "Análisis de El Quijote - Capítulo I",
    autor: "est_morales",
    categoria: "Literatura",
    fecha: "Hace 2 días",
    respuestas: 6,
    likes: 9,
    resuelto: true,
    contenido:
      "¿Cuáles son los temas principales del primer capítulo de El Quijote?",
  },
];

const RESPUESTAS_INICIALES = {
  1: [
    {
      id: 1,
      autor: "prof_martinez",
      texto:
        "La integración por partes usa la fórmula: ∫u dv = uv - ∫v du. Se usa cuando tienes un producto de funciones.",
      fecha: "Hace 1 hora",
      likes: 8,
    },
    {
      id: 2,
      autor: "est_lopez",
      texto:
        "También recuerda la regla LIATE para elegir qué función es 'u': Logarítmica, Inversa trigonométrica, Algebraica, Trigonométrica, Exponencial.",
      fecha: "Hace 45 min",
      likes: 4,
    },
  ],
  2: [
    {
      id: 1,
      autor: "prof_sanchez",
      texto:
        "En circuitos paralelos: 1/Rt = 1/R1 + 1/R2 + ... + 1/Rn. La resistencia total siempre es menor que la mínima individual.",
      fecha: "Hace 3 horas",
      likes: 3,
    },
  ],
};

// ─── Modal nuevo hilo ─────────────────────────────────────────────────────────
function ModalNuevoHilo({ onCrear, onCerrar }) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;
    onCrear({ titulo, contenido, categoria });
  };

  return (
    <div className="fo-overlay" onClick={onCerrar}>
      <div className="fo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fo-modal-header">
          <h3>Nueva pregunta</h3>
          <button className="fo-modal-close" onClick={onCerrar}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="fo-modal-form">
          <div className="fo-field">
            <label>Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="fo-field">
            <label>Título de la pregunta</label>
            <input
              type="text"
              placeholder="¿Cuál es tu duda?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>
          <div className="fo-field">
            <label>Descripción</label>
            <textarea
              placeholder="Explica tu pregunta con detalle..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="fo-modal-actions">
            <button
              type="button"
              className="fo-btn fo-btn--ghost"
              onClick={onCerrar}
            >
              Cancelar
            </button>
            <button type="submit" className="fo-btn fo-btn--primary">
              <Send size={15} /> Publicar pregunta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Vista detalle de hilo ────────────────────────────────────────────────────
function VistaHilo({
  hilo,
  respuestas,
  onVolver,
  onResponder,
  onLike,
  onMarcarResuelto,
}) {
  const [texto, setTexto] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!texto.trim()) return;
    onResponder(hilo.id, texto);
    setTexto("");
  };

  return (
    <div className="fo-detalle">
      <button className="fo-back" onClick={onVolver}>
        <ArrowLeft size={16} /> Volver al foro
      </button>

      {/* Pregunta original */}
      <div className="fo-pregunta-card">
        <div className="fo-pregunta-top">
          <div className="fo-tags">
            <span className="fo-tag fo-tag--cat">{hilo.categoria}</span>
            {hilo.resuelto ? (
              <span className="fo-tag fo-tag--resuelto">
                <CheckCircle2 size={12} /> Resuelto
              </span>
            ) : (
              <span className="fo-tag fo-tag--nuevo">
                <Clock size={12} /> Nuevo
              </span>
            )}
          </div>
          {!hilo.resuelto && (
            <button
              className="fo-btn fo-btn--sm fo-btn--success"
              onClick={() => onMarcarResuelto(hilo.id)}
            >
              <CheckCircle2 size={14} /> Marcar resuelto
            </button>
          )}
        </div>

        <h2 className="fo-pregunta-titulo">{hilo.titulo}</h2>

        <div className="fo-pregunta-meta">
          <span>
            <User size={13} /> {hilo.autor}
          </span>
          <span>
            <Clock size={13} /> {hilo.fecha}
          </span>
        </div>

        <p className="fo-pregunta-contenido">{hilo.contenido}</p>

        <div className="fo-pregunta-footer">
          <button
            className="fo-like-btn"
            onClick={() => onLike("hilo", hilo.id)}
          >
            <ThumbsUp size={14} /> {hilo.likes}
          </button>
          <span className="fo-resp-count">
            <MessageSquare size={13} /> {respuestas.length} respuestas
          </span>
        </div>
      </div>

      {/* Respuestas */}
      {respuestas.length > 0 && (
        <div className="fo-respuestas">
          <h4 className="fo-resp-titulo">Respuestas ({respuestas.length})</h4>
          {respuestas.map((r) => (
            <div key={r.id} className="fo-resp-card">
              <div className="fo-resp-header">
                <div className="fo-resp-autor">
                  <div className="fo-avatar">{r.autor[0].toUpperCase()}</div>
                  <div>
                    <span className="fo-resp-nombre">{r.autor}</span>
                    <span className="fo-resp-fecha">{r.fecha}</span>
                  </div>
                </div>
                <button
                  className="fo-like-btn fo-like-btn--sm"
                  onClick={() => onLike("resp", r.id)}
                >
                  <ThumbsUp size={12} /> {r.likes}
                </button>
              </div>
              <p className="fo-resp-texto">{r.texto}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulario de respuesta */}
      <div className="fo-reply-box">
        <h4>Tu respuesta</h4>
        <form onSubmit={handleSubmit}>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={4}
            required
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "12px",
            }}
          >
            <button type="submit" className="fo-btn fo-btn--primary">
              <Send size={15} /> Enviar respuesta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Forum() {
  const [hilos, setHilos] = useState(HILOS_INICIALES);
  const [respuestas, setRespuestas] = useState(RESPUESTAS_INICIALES);
  const [hiloSeleccionado, setHiloSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [filtro, setFiltro] = useState("todos");

  const hilosFiltrados =
    filtro === "todos"
      ? hilos
      : filtro === "resueltos"
        ? hilos.filter((h) => h.resuelto)
        : hilos.filter((h) => !h.resuelto);

  const handleCrear = ({ titulo, contenido, categoria }) => {
    const nuevo = {
      id: Date.now(),
      titulo,
      contenido,
      categoria,
      autor: "yo",
      fecha: "Ahora mismo",
      respuestas: 0,
      likes: 0,
      resuelto: false,
    };
    setHilos((prev) => [nuevo, ...prev]);
    setRespuestas((prev) => ({ ...prev, [nuevo.id]: [] }));
    setMostrarModal(false);
  };

  const handleResponder = (idHilo, texto) => {
    const nueva = {
      id: Date.now(),
      autor: "yo",
      texto,
      fecha: "Ahora mismo",
      likes: 0,
    };
    setRespuestas((prev) => ({
      ...prev,
      [idHilo]: [...(prev[idHilo] ?? []), nueva],
    }));
    setHilos((prev) =>
      prev.map((h) =>
        h.id === idHilo ? { ...h, respuestas: h.respuestas + 1 } : h,
      ),
    );
    setHiloSeleccionado((prev) =>
      prev ? { ...prev, respuestas: prev.respuestas + 1 } : prev,
    );
  };

  const handleLike = (tipo, id) => {
    if (tipo === "hilo") {
      setHilos((prev) =>
        prev.map((h) => (h.id === id ? { ...h, likes: h.likes + 1 } : h)),
      );
      setHiloSeleccionado((prev) =>
        prev?.id === id ? { ...prev, likes: prev.likes + 1 } : prev,
      );
    } else {
      setRespuestas((prev) => {
        const updated = {};
        for (const [key, arr] of Object.entries(prev)) {
          updated[key] = arr.map((r) =>
            r.id === id ? { ...r, likes: r.likes + 1 } : r,
          );
        }
        return updated;
      });
    }
  };

  const handleMarcarResuelto = (id) => {
    setHilos((prev) =>
      prev.map((h) => (h.id === id ? { ...h, resuelto: true } : h)),
    );
    setHiloSeleccionado((prev) =>
      prev?.id === id ? { ...prev, resuelto: true } : prev,
    );
  };

  if (hiloSeleccionado) {
    return (
      <VistaHilo
        hilo={hiloSeleccionado}
        respuestas={respuestas[hiloSeleccionado.id] ?? []}
        onVolver={() => setHiloSeleccionado(null)}
        onResponder={handleResponder}
        onLike={handleLike}
        onMarcarResuelto={handleMarcarResuelto}
      />
    );
  }

  return (
    <div className="fo-root">
      {mostrarModal && (
        <ModalNuevoHilo
          onCrear={handleCrear}
          onCerrar={() => setMostrarModal(false)}
        />
      )}

      {/* Header */}
      <div className="fo-header">
        <div>
          <h2 className="fo-titulo">Foro de Discusión</h2>
          <p className="fo-subtitulo">
            Supervisa las discusiones y preguntas de los estudiantes
          </p>
        </div>
        <button
          className="fo-btn fo-btn--primary"
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={16} /> Nueva pregunta
        </button>
      </div>

      <div className="fo-filtros">
        {["todos", "resueltos", "pendientes"].map((f) => (
          <button
            key={f}
            className={`fo-filtro-btn ${filtro === f ? "fo-filtro-btn--active" : ""}`}
            onClick={() => setFiltro(f)}
          >
            {f === "todos"
              ? "Todos"
              : f === "resueltos"
                ? "Resueltos"
                : "Pendientes"}
            <span className="fo-filtro-count">
              {f === "todos"
                ? hilos.length
                : f === "resueltos"
                  ? hilos.filter((h) => h.resuelto).length
                  : hilos.filter((h) => !h.resuelto).length}
            </span>
          </button>
        ))}
      </div>

      <div className="fo-lista">
        {hilosFiltrados.length === 0 ? (
          <div className="fo-empty">
            <MessageSquare size={32} />
            <p>No hay preguntas en esta categoría</p>
          </div>
        ) : (
          hilosFiltrados.map((hilo) => (
            <div
              key={hilo.id}
              className="fo-card"
              onClick={() => setHiloSeleccionado(hilo)}
            >
              <div className="fo-card-tags">
                <span className="fo-tag fo-tag--cat">{hilo.categoria}</span>
                {hilo.resuelto ? (
                  <span className="fo-tag fo-tag--resuelto">
                    <CheckCircle2 size={11} /> Resuelto
                  </span>
                ) : (
                  <span className="fo-tag fo-tag--nuevo">
                    <Clock size={11} /> Nuevo
                  </span>
                )}
              </div>
              <h4 className="fo-card-titulo">{hilo.titulo}</h4>
              <div className="fo-card-meta">
                <span>
                  <User size={12} /> {hilo.autor}
                </span>
                <span>
                  <MessageSquare size={12} /> {hilo.respuestas} respuestas
                </span>
                <span>
                  <ThumbsUp size={12} /> {hilo.likes}
                </span>
                <span>
                  <Clock size={12} /> {hilo.fecha}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
