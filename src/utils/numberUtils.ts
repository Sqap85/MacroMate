export function formatNumber(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const scale = 10 ** fractionDigits;
  const rounded = Math.round((value + Number.EPSILON) * scale) / scale;

  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return Number.parseFloat(rounded.toFixed(fractionDigits)).toString();
}

export function formatGrams(value: number): string {
  return formatNumber(value, 1);
}