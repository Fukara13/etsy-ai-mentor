/**
 * OC-9: Single step in the operator bridge path.
 * Operator-readable; no internal runtime details.
 */

import type { OperatorBridgePathStage } from './operator-bridge-path-stage'

export const BRIDGE_PATH_STEP_STATUSES = [
  'pending',
  'active',
  'completed',
  'skipped',
  'unavailable',
] as const

export type OperatorBridgePathStepStatus = (typeof BRIDGE_PATH_STEP_STATUSES)[number]

export interface OperatorBridgePathStep {
  readonly stage: OperatorBridgePathStage
  readonly title: string
  readonly status: OperatorBridgePathStepStatus
  readonly summary: string
  readonly isActive: boolean
  readonly isCompleted: boolean
}
