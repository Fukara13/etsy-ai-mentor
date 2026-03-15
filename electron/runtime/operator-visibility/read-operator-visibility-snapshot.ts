/**
 * OC-8: Canonical read entry for operator visibility.
 * Reads from existing runtime store only; no analysis, no mutation, no heroes.
 */

import { getCurrentOperatorAdvisoryProjection } from '../operator-advisory-runtime'
import { createOperatorVisibilitySnapshot } from './create-operator-visibility-snapshot'
import type { OperatorVisibilitySnapshot } from './operator-visibility-snapshot'

/**
 * Returns current operator visibility snapshot from runtime store.
 * Read-only; does not invoke hero runtime or repair engine.
 */
export function readOperatorVisibilitySnapshot(): OperatorVisibilitySnapshot {
  const advisoryProjection = getCurrentOperatorAdvisoryProjection()
  return createOperatorVisibilitySnapshot(advisoryProjection)
}
