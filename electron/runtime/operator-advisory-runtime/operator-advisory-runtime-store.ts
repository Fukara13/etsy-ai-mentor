/**
 * OC-7: In-process memory store for current operator advisory projection.
 * Read by IPC handler; written by webhook handler after hero run.
 * Process-memory only; no persistence or caching infrastructure.
 */

import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

let current: OperatorRuntimeAdvisoryProjection | null = null

export function getCurrentOperatorAdvisoryProjection(): OperatorRuntimeAdvisoryProjection | null {
  return current
}

export function setCurrentOperatorAdvisoryProjection(
  projection: OperatorRuntimeAdvisoryProjection | null
): void {
  current = projection
}
