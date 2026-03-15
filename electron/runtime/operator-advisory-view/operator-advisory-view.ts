/**
 * OC-10: Canonical read entry for operator advisory view.
 * Composes visibility and bridge path readers; delegates shaping to derive.
 */

import { readOperatorVisibilitySnapshot } from '../operator-visibility'
import { readOperatorBridgePathAdvisory } from '../operator-bridge-path'
import type { OperatorAdvisoryView } from './operator-advisory-view.types'
import { deriveOperatorAdvisoryView } from './derive-operator-advisory-view'

/**
 * Returns the current operator advisory view (aggregated visibility + explainability).
 * Read-only; no direct store access; uses canonical runtime readers.
 */
export function readOperatorAdvisoryView(): OperatorAdvisoryView {
  const visibilitySnapshot = readOperatorVisibilitySnapshot()
  const bridgePathAdvisory = readOperatorBridgePathAdvisory()
  return deriveOperatorAdvisoryView(visibilitySnapshot, bridgePathAdvisory)
}
