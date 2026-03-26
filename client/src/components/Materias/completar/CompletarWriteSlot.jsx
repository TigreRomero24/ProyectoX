export default function CompletarWriteSlot({ value, onChange, inputRef, onEnter }) {
  return (
    <input
      ref={inputRef}
      className="ev-salir-btn"
      style={{ minWidth: 120, textAlign: "left", background: "#fff" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
    />
  );
}
