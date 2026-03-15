/**
 * OC-13: Maps operator advisory view to current decision timeline stage.
 * Pure; read-only. No new data sources; uses existing advisory view only.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorDecisionTimelineStage } from './operator-decision-timeline-stage'
import type { OperatorDecisionTimelineCurrentStage } from './operator-decision-timeline'

function hasAdvisorySummaries(advisoryView: OperatorAdvisoryView): boolean {
  if (!advisoryView.hasAdvisory || advisoryView.advisory == null) return false
  const n = advisoryView.advisory.projection.advisorySummaries?.length ?? 0
  return n > 0
}

/**
 * Returns the furthest decision timeline stage reachable from view signals.
 * operator-review-active, decision-pending, decision-resolved require persistence (out of scope).
 */
export function mapRuntimeStateToDecisionTimelineStage(
  advisoryView: OperatorAdvisoryView
): OperatorDecisionTimelineCurrentStage {
  const bridgePath = advisoryView.explainability.bridgePath

  if (advisoryView.hasAdvisory && hasAdvisorySummaries(advisoryView)) {
    return 'decision-context-ready'
  }
  if (advisoryView.hasAdvisory) {
    return 'advisory-available'
  }

  const hasPipelineSignal =
    bridgePath.steps.length > 0 || bridgePath.finalStage != null
  if (hasPipelineSignal) {
    return 'incident-detected'
  }

  return 'unknown'
}
