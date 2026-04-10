export function normalizeReferenceNumber(value: string) {
  return value.trim().toUpperCase();
}

export function formatReferenceNumberForDisplay(value: string) {
  const normalized = normalizeReferenceNumber(value);

  if (/^\d+$/.test(normalized)) {
    return `ORD-${normalized}`;
  }

  return normalized;
}

export function getReferenceAliases(value: string) {
  const normalized = normalizeReferenceNumber(value);
  const aliases = new Set<string>();

  if (!normalized) {
    return aliases;
  }

  aliases.add(normalized);

  const numericOrderMatch = normalized.match(/^ORD-(\d+)$/);
  if (numericOrderMatch?.[1]) {
    aliases.add(numericOrderMatch[1]);
  }

  if (/^\d+$/.test(normalized)) {
    aliases.add(`ORD-${normalized}`);
  }

  return aliases;
}
