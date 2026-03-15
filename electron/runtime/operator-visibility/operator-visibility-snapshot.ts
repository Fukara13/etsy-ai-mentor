/**
 * OC-8: Canonical read model for operator-facing visibility.
 * Wraps advisory state; no new advisory semantics.
 */

import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

/**
 * Single snapshot of operator visibility state.
 * All operator-facing surfaces read through this shape.
 */
export interface OperatorVisibilitySnapshot {
  readonly advisoryProjection: OperatorRuntimeAdvisoryProjection | null
  readonly hasAdvisory: boolean
  readonly source: 'runtime-store'
}
