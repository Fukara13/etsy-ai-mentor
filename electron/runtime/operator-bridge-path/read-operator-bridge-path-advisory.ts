/**
 * OC-9: Canonical read entry for operator bridge path advisory.
 * Consumes visibility via existing canonical path; no direct store access.
 */

import { readOperatorVisibilitySnapshot } from '../operator-visibility'
import type { OperatorBridgePathAdvisory } from './operator-bridge-path-advisory'
import { deriveOperatorBridgePathAdvisory } from './derive-operator-bridge-path-advisory'

/**
 * Returns the current operator bridge path advisory.
 * Single approved read entry; uses visibility snapshot, no mutation.
 */
export function readOperatorBridgePathAdvisory(): OperatorBridgePathAdvisory {
  const visibilitySnapshot = readOperatorVisibilitySnapshot()
  return deriveOperatorBridgePathAdvisory(visibilitySnapshot)
}
