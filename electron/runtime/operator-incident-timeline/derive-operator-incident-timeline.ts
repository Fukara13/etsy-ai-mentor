/**
 * OC-11: Pure derivation of operator incident timeline from operator advisory view.
 * Hiçbir I/O yok; sadece mevcut read modellerine dayalı deterministik projeksiyon.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type {
  OperatorIncidentTimeline,
  OperatorIncidentTimelineSummary,
} from './operator-incident-timeline'
import { getIncidentTimelineStageOrder } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'
import { createOperatorIncidentTimelineEntries } from './create-operator-incident-timeline-entries'
import { mapRuntimeStateToIncidentStage } from './map-runtime-state-to-incident-stage'

export function deriveOperatorIncidentTimeline(
  advisoryView: OperatorAdvisoryView
): OperatorIncidentTimeline {
  const bridgePath = advisoryView.explainability.bridgePath

  // Incident var sayımı:
  // - advisory varsa, veya
  // - bridge path gerçekten ilerlemişse (hasAdvisory ya da finalStage sinyali)
  const hasIncident =
    advisoryView.hasAdvisory ||
    bridgePath.hasAdvisory ||
    bridgePath.finalStage !== null

  const currentStage: OperatorIncidentTimelineStage | null = hasIncident
    ? mapRuntimeStateToIncidentStage(advisoryView)
    : null

  const entries = createOperatorIncidentTimelineEntries(currentStage, hasIncident, advisoryView)

  const summary: OperatorIncidentTimelineSummary = buildSummary(
    entries,
    currentStage,
    advisoryView
  )

  return {
    hasIncident,
    // Şu anda global, kalıcı bir incident anahtarı yok; bu gate sadece projeksiyon sağlar.
    incidentKey: null,
    currentStage,
    entries,
    summary,
  }
}

function buildSummary(
  entries: readonly ReturnType<typeof createOperatorIncidentTimelineEntries>[number][],
  currentStage: OperatorIncidentTimelineStage | null,
  advisoryView: OperatorAdvisoryView
): OperatorIncidentTimelineSummary {
  const totalStages = getIncidentTimelineStageOrder().length
  const completedStages = entries.filter((e) => e.status === 'completed').length
  const advisoryReached = entries.some(
    (e) =>
      (e.stage === 'advisory-projected' || e.stage === 'incident-ready') &&
      (advisoryView.hasAdvisory || advisoryView.explainability.bridgePath.hasAdvisory)
  )

  return {
    totalStages,
    completedStages,
    activeStage: currentStage,
    advisoryReached,
  }
}

