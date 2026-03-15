/**
 * OC-12: Maps operator advisory view to current advisory evolution stage.
 * Pure; no side effects. Conservative: do not mark a stage reached without evidence.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorAdvisoryEvolutionStage } from './operator-advisory-evolution-stage'

/**
 * Returns the furthest advisory evolution stage reached based on view signals.
 * operator-view-ready only when advisory has at least one summary.
 */
export function mapRuntimeStateToAdvisoryEvolutionStage(
  advisoryView: OperatorAdvisoryView
): OperatorAdvisoryEvolutionStage | null {
  const bridgePath = advisoryView.explainability.bridgePath

  if (advisoryView.hasAdvisory && advisoryView.advisory != null) {
    const n = advisoryView.advisory.projection.advisorySummaries?.length ?? 0
    if (n > 0) return 'operator-view-ready'
    return 'advisory-generated'
  }

  const finalStage = bridgePath.finalStage
  if (finalStage === 'governance') return 'governance-evaluated'
  if (finalStage === 'hero-analysis') return 'hero-analysis'
  if (finalStage === 'advisory-projection') return 'advisory-generated'

  if (bridgePath.steps.length > 0) return 'bridge-path-derived'

  return null
}
