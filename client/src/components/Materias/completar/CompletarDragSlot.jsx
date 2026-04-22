export default function CompletarDragSlot({
  espacioId,
  label,
  value,
  onDropFicha,
  onTapAssign,
  onClear,
  selectedFicha,
}) {
  const isFilled = !!value;

  return (
    <button
      type="button"
      className={`ev-completar-slot ${isFilled ? "ev-completar-slot--filled" : ""} ${selectedFicha ? "ev-completar-slot--active" : ""}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const texto = e.dataTransfer.getData("text/plain");
        if (texto) onDropFicha(espacioId, texto);
      }}
      onClick={() => {
        if (selectedFicha) onTapAssign(espacioId, selectedFicha);
      }}
    >
      <span>{value || `[[${label || espacioId}]]`}</span>
      {isFilled && (
        <span
          className="ev-slot-close"
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onClear(espacioId);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClear(espacioId);
            }
          }}
        >
          ×
        </span>
      )}
    </button>
  );
}

