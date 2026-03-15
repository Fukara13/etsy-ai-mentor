/**
 * OC-10: Canonical operator advisory view contract.
 * Aggregation of visibility snapshot and bridge path; read-only.
 */

import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'

export interface OperatorAdvisoryView {
  readonly hasAdvisory: boolean
  readonly source: 'operator-advisory-view'
  readonly advisory: {
    readonly projection: OperatorRuntimeAdvisoryProjection
  } | null
  readonly explainability: {
    readonly bridgePath: OperatorBridgePathAdvisory
  }
  readonly status: {
    readonly visibility: 'visible' | 'empty'
    readonly explainability: 'available' | 'empty'
    readonly consistency: 'aligned' | 'empty'
  }
}
