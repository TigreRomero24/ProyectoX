export default function CompletarTokenBank({ fichas, usedValues, selectedFicha, onSelect }) {
  return (
    <div className="ev-opciones" style={{ marginTop: 6 }}>
      <div className="ev-opcion ev-opcion--idle" style={{ flexWrap: "wrap", gap: 8 }}>
        {fichas.map((ficha) => {
          const texto = String(ficha?.texto || "");
          const isUsed = usedValues.has(texto.toLowerCase());
          const selected = selectedFicha === texto;
          return (
            <button
              key={ficha.ficha_id || texto}
              type="button"
              draggable={!isUsed}
              className={`ev-salir-btn ${selected ? "ev-opcion--seleccionada" : ""}`}
              style={{ opacity: isUsed ? 0.5 : 1 }}
              onDragStart={(e) => e.dataTransfer.setData("text/plain", texto)}
              onClick={() => onSelect(selected ? "" : texto)}
              disabled={isUsed}
            >
              {texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
