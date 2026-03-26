const SLOT_REGEX = /\[\[([^\]]+)\]\]/g;

export const parseCompletarText = (texto = "") => {
  const source = String(texto || "");
  const tokens = [];
  const slots = [];
  const seen = new Set();
  const duplicates = [];

  let cursor = 0;
  let match;
  while ((match = SLOT_REGEX.exec(source))) {
    const rawId = String(match[1] || "").trim();
    if (match.index > cursor) {
      tokens.push({ type: "text", value: source.slice(cursor, match.index) });
    }

    tokens.push({ type: "slot", espacio_id: rawId });
    if (rawId) {
      slots.push(rawId);
      if (seen.has(rawId)) duplicates.push(rawId);
      seen.add(rawId);
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < source.length) {
    tokens.push({ type: "text", value: source.slice(cursor) });
  }

  return {
    tokens,
    slotIds: slots,
    hasSlots: slots.length > 0,
    duplicateSlots: [...new Set(duplicates)],
  };
};
