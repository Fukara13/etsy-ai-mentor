/**
 * Pure deterministic utilities — no side effects, no time/network/filesystem.
 * Safe for Gate-S3 deterministic tests.
 */

export function add(a: number, b: number): number {
  return a + b
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}
