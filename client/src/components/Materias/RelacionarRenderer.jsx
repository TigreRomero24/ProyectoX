import { useMemo } from "react";

// En examen el servidor envía { izquierda: [{id, texto}], derecha: [textos mezclados] };
// en test llega la estructura completa con `pares`, así que se arma aquí.
export default function RelacionarRenderer({ pregunta, valor, onChange, disabled }) {
  const estructura = pregunta.estructura_json || {};
  const { izquierda, derecha } = useMemo(() => {
    if (Array.isArray(estructura.izquierda)) {
      return { izquierda: estructura.izquierda, derecha: estructura.derecha || [] };
    }
    const pares = estructura.pares || [];
    return {
      izquierda: pares.map((p, i) => ({ id: String.fromCharCode(65 + i), texto: p.izquierda })),
      derecha: pares.map((p) => p.derecha).sort(() => Math.random() - 0.5),
    };
  }, [pregunta.id_pregunta]);

  const elegidos = new Map((valor?.pares || []).map((p) => [p.izq_id, p.derecha]));

  const elegir = (izq_id, derechaTxt) => {
    elegidos.set(izq_id, derechaTxt);
    onChange({
      pares: [...elegidos]
        .filter(([, d]) => d)
        .map(([id, d]) => ({ izq_id: id, derecha: d })),
    });
  };

  return (
    <div className="ev-relacionar">
      {izquierda.map((item) => (
        <div key={item.id} className="ev-ordenar-item" style={{ gap: 12 }}>
          <span>
            <strong>{item.id}.</strong> {item.texto}
          </span>
          <select
            value={elegidos.get(item.id) || ""}
            onChange={(e) => elegir(item.id, e.target.value)}
            disabled={disabled}
            style={{ minWidth: 160, maxWidth: "50%", padding: "6px 8px" }}
          >
            <option value="">— Elegir —</option>
            {derecha.map((d, i) => (
              <option key={i} value={d}>{d}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
