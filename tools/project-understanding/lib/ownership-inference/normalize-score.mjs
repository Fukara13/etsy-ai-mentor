/**
 * Normalize score to 0.00–1.00 range. Deterministic.
 */

export function normalizeScore(val) {
  const n = Number(val);
  if (Number.isNaN(n) || n < 0) return 0;
  if (n > 1) return 1;
  return Math.round(n * 100) / 100;
}
