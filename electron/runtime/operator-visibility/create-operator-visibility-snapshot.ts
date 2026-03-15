/**
 * OC-8: Pure snapshot builder. No I/O, no time, no side effects.
 */

import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorVisibilitySnapshot } from './operator-visibility-snapshot'

/**
 * Builds a visibility snapshot from current advisory projection.
 * Deterministic: same input => same output.
 */
export function createOperatorVisibilitySnapshot(
  advisoryProjection: OperatorRuntimeAdvisoryProjection | null
): OperatorVisibilitySnapshot {
  return {
    advisoryProjection,
    hasAdvisory: advisoryProjection !== null,
    source: 'runtime-store',
  }
}
