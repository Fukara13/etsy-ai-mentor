/**
 * OC-11: Builds ordered incident timeline entries from current stage + advisory view.
 */

import { getIncidentTimelineStageOrder } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineEntry } from './operator-incident-timeline-entry'
import type { OperatorIncidentTimelineStatus } from './operator-incident-timeline-status'
import { mapAdvisoryViewToTimelineEntry } from './map-advisory-view-to-timeline-entry'
import type { OperatorAdvisoryView } from '../operator-advisory-view'

export function createOperatorIncidentTimelineEntries(
  currentStage: OperatorIncidentTimelineStage | null,
  hasIncident: boolean,
  advisoryView: OperatorAdvisoryView
): OperatorIncidentTimelineEntry[] {
  const stages = getIncidentTimelineStageOrder()

  if (!hasIncident || currentStage === null) {
    // Yetersiz sinyal: tüm aşamalar not-reached veya unknown olarak işaretlenebilir.
    return stages.map((stage, index) =>
      mapAdvisoryViewToTimelineEntry(stage, hasIncident ? 'unknown' : 'not-reached', index, advisoryView)
    )
  }

  const currentIndex = stages.indexOf(currentStage)

  return stages.map((stage, index) => {
    let status: OperatorIncidentTimelineStatus
    if (currentIndex === -1) {
      status = 'unknown'
    } else if (index < currentIndex) {
      status = 'completed'
    } else if (index === currentIndex) {
      status = 'active'
    } else {
      status = 'not-reached'
    }

    return mapAdvisoryViewToTimelineEntry(stage, status, index, advisoryView)
  })
}

