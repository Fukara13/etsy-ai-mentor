/**
 * OC-9: Canonical read model for operator bridge path advisory.
 * Describes how the current advisory was formed across the runtime pipeline.
 */

import type { OperatorBridgePathStage } from './operator-bridge-path-stage'
import type { OperatorBridgePathStep } from './operator-bridge-path-step'

export interface OperatorBridgePathAdvisory {
  readonly hasAdvisory: boolean
  readonly source: 'runtime-bridge'
  readonly finalStage: OperatorBridgePathStage | null
  readonly steps: readonly OperatorBridgePathStep[]
  readonly advisorySummary?: string
}
