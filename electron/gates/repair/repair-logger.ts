/**
 * Gate-S14: Repair Logger — Standardized repair log format.
 * Console-based, no external dependencies.
 */

export function repairLog(
  traceId: string,
  state: string,
  actor: string,
  message: string
): void {
  const ts = new Date().toISOString();
  console.log(`[${traceId}] [${ts}] [${state}] [${actor}] ${message}`);
}
