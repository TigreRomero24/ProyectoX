export function parseDuration(str) {
  const units = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };

  const match = str?.trim().match(/^(\d+)([smhdw])$/i);

  if (!match) {
    throw new Error(`VALIDACION: Formato de duración JWT inválido: "${str}"`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  return value * units[unit];
}
