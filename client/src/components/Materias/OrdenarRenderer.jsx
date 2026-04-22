import React, { useState, useEffect } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

export default function OrdenarRenderer({ pregunta, onReorder, disabled, respuestaActual }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    // If we have an existing answer, use its order
    const opciones = pregunta.estructura_json?.opciones || [];
    const correctIds = pregunta.estructura_json?.respuesta?.orden_ids || [];
    
    // Create base items
    const baseItems = opciones.map((texto, i) => ({
      id: correctIds[i] || String.fromCharCode(65 + i),
      texto,
    }));

    if (respuestaActual?.orden_ids && respuestaActual.orden_ids.length === baseItems.length) {
      // Reconstruct based on user answer
      const sorted = [];
      for (const id of respuestaActual.orden_ids) {
        const found = baseItems.find(item => item.id === id);
        if (found) sorted.push(found);
      }
      setItems(sorted);
    } else {
      // Shuffle initially if no answer
      const shuffled = [...baseItems].sort(() => Math.random() - 0.5);
      setItems(shuffled);
      
      // Notify parent of initial shuffled order (so if they submit immediately, it's captured)
      if (onReorder) {
        onReorder({ orden_ids: shuffled.map(item => item.id) });
      }
    }
  }, [pregunta.id_pregunta]); // only re-run when question changes

  const moveItem = (index, direction) => {
    if (disabled) return;
    const newItems = [...items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    
    // Swap
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    setItems(newItems);
    
    if (onReorder) {
      onReorder({ orden_ids: newItems.map(item => item.id) });
    }
  };

  return (
    <div className="ev-ordenar-container">
      {items.map((item, idx) => (
        <div 
          key={item.id} 
          className={`ev-ordenar-item ${disabled ? "ev-ordenar-item--disabled" : ""}`}
        >
          <div className="ev-ordenar-controls">
            <button 
              type="button"
              className="ev-ordenar-btn"
              disabled={disabled || idx === 0} 
              onClick={() => moveItem(idx, -1)}
              title="Mover arriba"
            >
              <ArrowUp size={16} />
            </button>
            <button 
              type="button"
              className="ev-ordenar-btn"
              disabled={disabled || idx === items.length - 1} 
              onClick={() => moveItem(idx, 1)}
              title="Mover abajo"
            >
              <ArrowDown size={16} />
            </button>
          </div>
          <div className="ev-ordenar-index">{idx + 1}</div>
          <div className="ev-ordenar-text">{item.texto}</div>
        </div>
      ))}
    </div>
  );
}
