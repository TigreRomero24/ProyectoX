export default function CompletarDragSlot({
  espacioId,
  value,
  onDropFicha,
  onTapAssign,
  onClear,
  selectedFicha,
}) {
  return (
    <button
      type="button"
      className="ev-opcion ev-opcion--idle"
      style={{ display: "inline-flex", width: "auto", minWidth: 140, padding: "8px 10px" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const texto = e.dataTransfer.getData("text/plain");
        if (texto) onDropFicha(espacioId, texto);
      }}
      onClick={() => {
        if (selectedFicha) onTapAssign(espacioId, selectedFicha);
      }}
    >
      <span className="ev-opcion-texto" style={{ fontWeight: 700 }}>{`[[${espacioId}]]`}</span>
      <span className="ev-opcion-texto" style={{ marginLeft: 6 }}>{value || "(vacio)"}</span>
      {!!value && (
        <span
          role="button"
          tabIndex={0}
          style={{ marginLeft: 8, color: "#b91c1c", fontWeight: 700 }}
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
          x
        </span>
      )}
    </button>
  );
}
