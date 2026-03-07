/**
 * Gate-S14: Trace Context — Carry trace id across actors.
 */

export interface TraceContext {
  traceId: string;
}

export function createTraceContext(traceId: string): TraceContext {
  return { traceId };
}
