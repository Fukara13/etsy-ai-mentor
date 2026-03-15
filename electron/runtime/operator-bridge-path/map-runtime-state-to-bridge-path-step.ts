/**
 * OC-9: Pure mapper from runtime state to a single path step.
 * No I/O; deterministic.
 */

import type { OperatorBridgePathStage } from './operator-bridge-path-stage'
import type { OperatorBridgePathStep, OperatorBridgePathStepStatus } from './operator-bridge-path-step'

const STAGE_TITLES: Record<OperatorBridgePathStage, string> = {
  'webhook-intake': 'Webhook intake',
  'pr-inspection': 'PR inspection',
  'hero-analysis': 'Hero analysis',
  governance: 'Governance',
  'advisory-projection': 'Advisory projection',
}

export interface BridgePathStepInput {
  readonly stage: OperatorBridgePathStage
  readonly status: OperatorBridgePathStepStatus
  readonly summary: string
  readonly isActive: boolean
  readonly isCompleted: boolean
}

/**
 * Maps a single step input to the public step model.
 */
export function mapRuntimeStateToBridgePathStep(
  input: BridgePathStepInput
): OperatorBridgePathStep {
  return {
    stage: input.stage,
    title: STAGE_TITLES[input.stage],
    status: input.status,
    summary: input.summary,
    isActive: input.isActive,
    isCompleted: input.isCompleted,
  }
}
