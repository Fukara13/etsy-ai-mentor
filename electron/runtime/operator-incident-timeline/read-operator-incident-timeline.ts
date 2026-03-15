/**
 * OC-11: Canonical read entry for operator incident timeline projection.
 * Mevcut operator advisory view üzerine kuruludur; sadece okuma yapar.
 */

import { readOperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorIncidentTimeline } from './operator-incident-timeline'
import { deriveOperatorIncidentTimeline } from './derive-operator-incident-timeline'

export function readOperatorIncidentTimeline(): OperatorIncidentTimeline {
  const advisoryView = readOperatorAdvisoryView()
  return deriveOperatorIncidentTimeline(advisoryView)
}

