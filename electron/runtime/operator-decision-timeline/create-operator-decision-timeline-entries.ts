/**
 * OC-13: Builds ordered decision timeline entries from current stage and view.
 * Pure; deterministic headlines and details.
 */

import { getDecisionTimelineStageOrder } from './operator-decision-timeline-stage'
import type { OperatorDecisionTimelineStage } from './operator-decision-timeline-stage'
import type {
  OperatorDecisionTimelineEntry,
  OperatorDecisionTimelineEntryStatus,
} from './operator-decision-timeline-entry'
import type { OperatorDecisionTimelineCurrentStage } from './operator-decision-timeline'
import type { OperatorAdvisoryView } from '../operator-advisory-view'

function headlineFor(
  stage: OperatorDecisionTimelineStage,
  status: OperatorDecisionTimelineEntryStatus
): string {
  const suffix = status === 'active' ? ' (active)' : ''
  switch (stage) {
    case 'incident-detected':
      return 'Incident detected' + suffix
    case 'advisory-available':
      return 'Advisory available' + suffix
    case 'decision-context-ready':
      return 'Decision context ready' + suffix
    case 'operator-review-active':
      return 'Operator review active' + suffix
    case 'decision-pending':
      return 'Decision pending' + suffix
    case 'decision-resolved':
      return 'Decision resolved' + suffix
    default:
      return 'Decision timeline stage' + suffix
  }
}

function detailFor(stage: OperatorDecisionTimelineStage): string {
  switch (stage) {
    case 'incident-detected':
      return 'Incident detected for operator awareness.'
    case 'advisory-available':
      return 'Advisory context became available.'
    case 'decision-context-ready':
      return 'Decision context is prepared for operator review.'
    case 'operator-review-active':
      return 'Operator review is active.'
    case 'decision-pending':
      return 'Operator action is pending.'
    case 'decision-resolved':
      return 'Decision flow is resolved.'
    default:
      return 'No detail.'
  }
}

function isDecisionPointStage(stage: OperatorDecisionTimelineStage): boolean {
  return (
    stage === 'decision-context-ready' ||
    stage === 'operator-review-active' ||
    stage === 'decision-pending'
  )
}

function entryRequiresOperatorAction(
  stage: OperatorDecisionTimelineStage,
  status: OperatorDecisionTimelineEntryStatus
): boolean {
  return status === 'active' && isDecisionPointStage(stage)
}

export function createOperatorDecisionTimelineEntries(
  currentStage: OperatorDecisionTimelineCurrentStage,
  _advisoryView: OperatorAdvisoryView
): OperatorDecisionTimelineEntry[] {
  const stages = getDecisionTimelineStageOrder()
  const resolvedStage: OperatorDecisionTimelineStage | null =
    currentStage === 'unknown' ? null : currentStage
  const currentIndex =
    resolvedStage != null ? stages.indexOf(resolvedStage) : -1

  return stages.map((stage, index) => {
    let status: OperatorDecisionTimelineEntryStatus
    if (currentIndex === -1) {
      status = 'unknown'
    } else if (index < currentIndex) {
      status = 'completed'
    } else if (index === currentIndex) {
      status = 'active'
    } else {
      status = 'not-reached'
    }
    return {
      stage,
      status,
      order: index,
      headline: headlineFor(stage, status),
      detail: detailFor(stage),
      isDecisionPoint: isDecisionPointStage(stage),
      requiresOperatorAction: entryRequiresOperatorAction(stage, status),
    }
  })
}
