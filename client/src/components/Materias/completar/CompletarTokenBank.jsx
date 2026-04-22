export default function CompletarTokenBank({ fichas, usedValues, selectedFicha, onSelect }) {
  return (
    <div className="ev-completar-bank">
      {fichas.map((ficha) => {
        const texto = String(ficha?.texto || "");
        const isUsed = usedValues.has(texto.toLowerCase());
        const selected = selectedFicha === texto;
        
        return (
          <button
            key={ficha.ficha_id || texto}
            type="button"
            draggable={!isUsed}
            className={`ev-ficha ${selected ? "ev-ficha--selected" : ""} ${isUsed ? "ev-ficha--used" : ""}`}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", texto)}
            onClick={() => onSelect(selected ? "" : texto)}
            disabled={isUsed}
          >
            {texto}
          </button>
        );
      })}
    </div>
  );
}

