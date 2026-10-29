import { useMemo, useState } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import "./ProgresoMateria.css";

const nombreMateria = (i) =>
  i.configuracion?.Materia?.nombre || i.configuracion?.Materium?.nombre || "—";

const pctDe = (i) => Math.round((i.nota_final / 10) * 100);

const fechaDe = (i) => new Date(i.fecha_fin || i.fecha_inicio).getTime();

export default function ProgresoMateria({ datos }) {
  const porMateria = useMemo(() => {
    const mapa = new Map();
    for (const intento of datos) {
      const nombre = nombreMateria(intento);
      if (!mapa.has(nombre)) mapa.set(nombre, []);
      mapa.get(nombre).push(intento);
    }
    return [...mapa.entries()]
      .map(([nombre, intentos]) => {
        const ordenados = [...intentos].sort((a, b) => fechaDe(a) - fechaDe(b));
        const promedio = Math.round(
          ordenados.reduce((s, i) => s + pctDe(i), 0) / ordenados.length,
        );
        return { nombre, intentos: ordenados, promedio };
      })
      .sort((a, b) => a.promedio - b.promedio); // materias más flojas primero
  }, [datos]);

  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const activa = porMateria.find((m) => m.nombre === materiaSeleccionada) || porMateria[0];

  if (porMateria.length === 0) {
    return (
      <div className="prog-vacio">
        <TrendingUp size={32} />
        <p>Aún no hay suficientes evaluaciones para mostrar tu progreso.</p>
      </div>
    );
  }

  return (
    <div className="prog-root">
      <div className="prog-columna">
        <h3 className="prog-subtitulo">Precisión promedio por materia</h3>
        <p className="prog-ayuda">Las materias donde estás más flojo aparecen primero.</p>
        <div className="prog-barras">
          {porMateria.map((m) => (
            <button
              key={m.nombre}
              className={`prog-barra-fila${activa?.nombre === m.nombre ? " activa" : ""}`}
              onClick={() => setMateriaSeleccionada(m.nombre)}
            >
              <span className="prog-barra-nombre">{m.nombre}</span>
              <div className="prog-barra-track">
                <div
                  className={`prog-barra-fill${m.promedio < 70 ? " baja" : ""}`}
                  style={{ width: `${m.promedio}%` }}
                />
              </div>
              <span className="prog-barra-pct">{m.promedio}%</span>
              {m.promedio < 70 && <AlertTriangle size={13} className="prog-alerta-icon" />}
            </button>
          ))}
        </div>
      </div>

      <div className="prog-columna">
        <h3 className="prog-subtitulo">Evolución en {activa.nombre}</h3>
        <p className="prog-ayuda">
          {activa.intentos.length} evaluación{activa.intentos.length !== 1 ? "es" : ""} registrada
          {activa.intentos.length !== 1 ? "s" : ""}
        </p>
        <GraficoLinea intentos={activa.intentos} />
      </div>
    </div>
  );
}

function GraficoLinea({ intentos }) {
  const ANCHO = 420;
  const ALTO = 180;
  const PAD = 24;

  if (intentos.length < 2) {
    return (
      <div className="prog-linea-vacio">
        Necesitas al menos 2 evaluaciones en esta materia para ver una tendencia.
      </div>
    );
  }

  const puntos = intentos.map((intento, i) => {
    const x = PAD + (i / (intentos.length - 1)) * (ANCHO - PAD * 2);
    const y = ALTO - PAD - (pctDe(intento) / 100) * (ALTO - PAD * 2);
    return { x, y, pct: pctDe(intento) };
  });

  const path = puntos.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const yReferencia = ALTO - PAD - 0.7 * (ALTO - PAD * 2); // línea de 70% (nota mínima)

  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="prog-linea-svg">
      <line
        x1={PAD}
        x2={ANCHO - PAD}
        y1={yReferencia}
        y2={yReferencia}
        className="prog-linea-referencia"
      />
      <path d={path} className="prog-linea-path" fill="none" />
      {puntos.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          className={`prog-linea-punto${p.pct < 70 ? " baja" : ""}`}
        />
      ))}
    </svg>
  );
}
