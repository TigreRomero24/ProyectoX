import { useMemo, useRef, useState } from "react";
import CompletarWriteSlot from "./CompletarWriteSlot";
import CompletarDragSlot from "./CompletarDragSlot";
import CompletarTokenBank from "./CompletarTokenBank";
import { parseCompletarText } from "./completarParser";
import { COMPLETAR_MODO, resolveCompletarMode } from "./completarState";

export default function CompletarRenderer({ estructura, respuestaMap, onChangeMap }) {
  const mode = resolveCompletarMode(estructura);
  const { tokens, slotIds } = useMemo(
    () => parseCompletarText(estructura?.texto || ""),
    [estructura?.texto],
  );
  const inputRefs = useRef({});
  const [selectedFicha, setSelectedFicha] = useState("");

  const usedValues = useMemo(() => {
    const set = new Set();
    Object.values(respuestaMap || {}).forEach((item) => {
      const respuesta = String(item?.respuesta || "").trim().toLowerCase();
      if (respuesta) set.add(respuesta);
    });
    return set;
  }, [respuestaMap]);

  const handleWrite = (espacioId, value) => {
    onChangeMap({
      ...respuestaMap,
      [espacioId]: { respuesta: value, origen: "INPUT" },
    });
  };

  const assignDrag = (espacioId, value) => {
    const next = { ...respuestaMap };
    Object.keys(next).forEach((key) => {
      if (key !== espacioId && String(next[key]?.respuesta || "").toLowerCase() === String(value).toLowerCase()) {
        next[key] = { ...next[key], respuesta: "", origen: "DRAG" };
      }
    });
    next[espacioId] = { respuesta: value, origen: "DRAG" };
    onChangeMap(next);
    setSelectedFicha("");
  };

  return (
    <div className="ev-opciones" style={{ display: 'block' }}>
      <div className="ev-completar-text-wrap">
        {tokens.map((token, idx) => {
          if (token.type === "text") {
            return (
              <span key={`t-${idx}`} style={{ whiteSpace: "pre-wrap" }}>
                {token.value}
              </span>
            );
          }

          const current = respuestaMap?.[token.espacio_id]?.respuesta || "";
          const slotIndex = slotIds.findIndex((id) => id === token.espacio_id);

          if (mode === COMPLETAR_MODO.ARRASTRAR) {
            return (
              <CompletarDragSlot
                key={`s-${idx}`}
                espacioId={token.espacio_id}
                label={token.label}
                value={current}
                selectedFicha={selectedFicha}
                onDropFicha={assignDrag}
                onTapAssign={assignDrag}
                onClear={(id) =>
                  onChangeMap({ ...respuestaMap, [id]: { respuesta: "", origen: "DRAG" } })
                }
              />
            );
          }

          return (
            <CompletarWriteSlot
              key={`s-${idx}`}
              value={current}
              inputRef={(el) => {
                inputRefs.current[token.espacio_id] = el;
              }}
              onChange={(value) => handleWrite(token.espacio_id, value)}
              onEnter={() => {
                const next = slotIds[slotIndex + 1];
                if (next) inputRefs.current[next]?.focus();
              }}
            />
          );
        })}
      </div>

      {mode === COMPLETAR_MODO.ARRASTRAR && (
        <div style={{ marginTop: 10 }}>
          <p className="ev-mode-label" style={{ marginBottom: 10, fontSize: '0.75rem' }}>
            <span style={{ verticalAlign: 'middle', marginRight: 5 }}>ℹ️</span>
            Arrastra una ficha a un hueco o toca ficha + hueco (móvil)
          </p>
          <CompletarTokenBank
            fichas={Array.isArray(estructura?.opciones_arrastrar) ? estructura.opciones_arrastrar : []}
            usedValues={usedValues}
            selectedFicha={selectedFicha}
            onSelect={setSelectedFicha}
          />
        </div>
      )}
    </div>
  );
}
