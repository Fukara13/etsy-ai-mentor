/**
 * OC-10: Pure derivation of operator advisory view from visibility + bridge path.
 * No I/O; deterministic.
 */

import type { OperatorVisibilitySnapshot } from '../operator-visibility'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import type { OperatorAdvisoryView } from './operator-advisory-view.types'

/**
 * Assembles the canonical operator advisory view from visibility and bridge path.
 * Stable shape: advisory null when no projection; explainability always present.
 */
export function deriveOperatorAdvisoryView(
  visibilitySnapshot: OperatorVisibilitySnapshot,
  bridgePathAdvisory: OperatorBridgePathAdvisory
): OperatorAdvisoryView {
  const hasAdvisory = visibilitySnapshot.hasAdvisory
  const projection = visibilitySnapshot.advisoryProjection

  const advisory =
    projection != null
      ? { projection }
      : null

  const visibility: 'visible' | 'empty' = hasAdvisory ? 'visible' : 'empty'
  const explainabilityStatus: 'available' | 'empty' =
    bridgePathAdvisory.steps.length > 0 ? 'available' : 'empty'
  const consistency: 'aligned' | 'empty' =
    hasAdvisory && bridgePathAdvisory.hasAdvisory ? 'aligned' : 'empty'

  return {
    hasAdvisory,
    source: 'operator-advisory-view',
    advisory,
    explainability: { bridgePath: bridgePathAdvisory },
    status: {
      visibility,
      explainability: explainabilityStatus,
      consistency,
    },
  }
}
