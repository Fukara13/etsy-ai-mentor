/**
 * OC-9: Pure derivation of bridge path advisory from visibility snapshot.
 * No I/O, no time, no randomness.
 */

import type { OperatorVisibilitySnapshot } from '../operator-visibility'
import { BRIDGE_PATH_STAGES } from './operator-bridge-path-stage'
import type { OperatorBridgePathStage } from './operator-bridge-path-stage'
import type { OperatorBridgePathAdvisory } from './operator-bridge-path-advisory'
import type { OperatorBridgePathStep } from './operator-bridge-path-step'
import { mapRuntimeStateToBridgePathStep } from './map-runtime-state-to-bridge-path-step'

function defaultSummary(stage: OperatorBridgePathStage): string {
  switch (stage) {
    case 'webhook-intake':
      return 'Webhook received and accepted.'
    case 'pr-inspection':
      return 'PR context inspected.'
    case 'hero-analysis':
      return 'Hero advisory run completed.'
    case 'governance':
      return 'Governance applied.'
    case 'advisory-projection':
      return 'Advisory projection ready.'
    default:
      return ''
  }
}

function buildAdvisorySummary(snapshot: OperatorVisibilitySnapshot): string | undefined {
  const p = snapshot.advisoryProjection
  if (!p) return undefined
  const n = p.advisorySummaries?.length ?? 0
  if (n === 0) return 'No advisory items.'
  if (n === 1) return '1 advisory item.'
  return `${n} advisory items.`
}

/**
 * Derives the operator bridge path advisory from the current visibility snapshot.
 * Deterministic: same snapshot => same result.
 */
export function deriveOperatorBridgePathAdvisory(
  visibilitySnapshot: OperatorVisibilitySnapshot
): OperatorBridgePathAdvisory {
  const hasAdvisory = visibilitySnapshot.hasAdvisory
  const finalStage: OperatorBridgePathStage | null = hasAdvisory
    ? 'advisory-projection'
    : null

  const steps: OperatorBridgePathStep[] = BRIDGE_PATH_STAGES.map((stage, index) => {
    const isLast = index === BRIDGE_PATH_STAGES.length - 1
    const isCompleted = hasAdvisory
    const isActive = hasAdvisory && isLast
    return mapRuntimeStateToBridgePathStep({
      stage,
      status: isCompleted ? 'completed' : 'pending',
      summary: isCompleted ? defaultSummary(stage) : 'Pending.',
      isActive,
      isCompleted,
    })
  })

  return {
    hasAdvisory,
    source: 'runtime-bridge',
    finalStage,
    steps,
    advisorySummary: buildAdvisorySummary(visibilitySnapshot),
  }
}
