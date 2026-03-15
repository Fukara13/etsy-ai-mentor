/**
 * OC-16: Read entry for unified operator timeline panel surface.
 * Read-only; composes existing runtime projections.
 */

import { readOperatorIncidentTimeline } from '../operator-incident-timeline'
import { readOperatorAdvisoryEvolutionTimeline } from '../operator-advisory-evolution'
import { readOperatorDecisionTimeline } from '../operator-decision-timeline'
import { readIncidentHistorySurface } from '../operator-incident-history'
import type { OperatorTimelinePanelSurface } from './types'
import { deriveOperatorTimelinePanelSurface } from './derive-operator-timeline-panel-surface'

export function readOperatorTimelinePanelSurface(): OperatorTimelinePanelSurface {
  const incidentTimeline = readOperatorIncidentTimeline()
  const advisoryEvolutionTimeline = readOperatorAdvisoryEvolutionTimeline()
  const decisionTimeline = readOperatorDecisionTimeline()
  const incidentHistory = readIncidentHistorySurface()

  return deriveOperatorTimelinePanelSurface({
    incidentTimeline,
    advisoryEvolutionTimeline,
    decisionTimeline,
    incidentHistory,
  })
}

