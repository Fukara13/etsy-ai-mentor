/**
 * OC-13: Pure derivation of operator decision timeline from advisory view.
 * No I/O; no mutation; deterministic.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorDecisionTimeline } from './operator-decision-timeline'
import type { OperatorDecisionTimelineCurrentStage } from './operator-decision-timeline'
import { mapRuntimeStateToDecisionTimelineStage } from './map-runtime-state-to-decision-timeline-stage'
import { createOperatorDecisionTimelineEntries } from './create-operator-decision-timeline-entries'

function buildSummary(currentStage: OperatorDecisionTimelineCurrentStage): string {
  if (currentStage === 'unknown') {
    return 'Decision context is not available yet.'
  }
  switch (currentStage) {
    case 'incident-detected':
      return 'Incident detected; decision context not yet available.'
    case 'advisory-available':
      return 'Advisory available; decision context not yet ready.'
    case 'decision-context-ready':
      return 'Operator review is currently active.'
    case 'operator-review-active':
      return 'Operator review is currently active.'
    case 'decision-pending':
      return 'Operator action is required.'
    case 'decision-resolved':
      return 'Decision flow is resolved.'
    default:
      return 'Decision timeline in progress.'
  }
}

function timelineRequiresOperatorAction(
  currentStage: OperatorDecisionTimelineCurrentStage
): boolean {
  return (
    currentStage === 'decision-context-ready' ||
    currentStage === 'operator-review-active' ||
    currentStage === 'decision-pending'
  )
}

export function deriveOperatorDecisionTimeline(
  advisoryView: OperatorAdvisoryView
): OperatorDecisionTimeline {
  const currentStage = mapRuntimeStateToDecisionTimelineStage(advisoryView)
  const entries = createOperatorDecisionTimelineEntries(currentStage, advisoryView)
  const summary = buildSummary(currentStage)
  const hasDecisionContext =
    currentStage !== 'unknown' && currentStage !== 'incident-detected'
  const requiresOperatorAction = timelineRequiresOperatorAction(currentStage)

  return {
    hasDecisionContext,
    incidentKey: null,
    currentStage,
    entries,
    summary,
    requiresOperatorAction,
  }
}
