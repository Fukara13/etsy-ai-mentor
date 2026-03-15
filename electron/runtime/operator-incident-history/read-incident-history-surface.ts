/**
 * OC-14: Entry point for operator incident history surface.
 * Read-only; uses existing runtime projections.
 */

import type { OperatorIncidentHistorySurface, RawIncidentDescriptor } from './types'
import { deriveIncidentHistorySurface } from './derive-incident-history-surface'
import { readOperatorIncidentTimeline } from '../operator-incident-timeline'
import { readOperatorDecisionTimeline } from '../operator-decision-timeline'
import type { OperatorIncidentTimeline } from '../operator-incident-timeline'

/**
 * Reads incident projections from runtime and returns the history surface.
 * No mutation; no persistence. With no persisted incidents, at most one
 * "current" incident is derived from incident + decision timelines.
 */
export function readIncidentHistorySurface(): OperatorIncidentHistorySurface {
  const raw = readRawIncidentDescriptors()
  return deriveIncidentHistorySurface(raw)
}

function readRawIncidentDescriptors(): RawIncidentDescriptor[] {
  const incidentTimeline = readOperatorIncidentTimeline()
  const decisionTimeline = readOperatorDecisionTimeline()

  if (!incidentTimeline.hasIncident) {
    return []
  }

  const incidentKey = incidentTimeline.incidentKey ?? 'current'
  const hasAdvisory = incidentTimeline.hasIncident
  const hasDecisionContext = decisionTimeline.hasDecisionContext
  const requiresOperatorAction = decisionTimeline.requiresOperatorAction
  const status = requiresOperatorAction ? 'active' : 'active'

  const title = buildCurrentIncidentTitle(incidentTimeline)

  const descriptor: RawIncidentDescriptor = {
    incidentKey,
    title,
    status,
    startedAt: undefined,
    lastUpdatedAt: undefined,
    requiresOperatorAction,
    hasAdvisory,
    hasDecisionContext,
  }

  return [descriptor]
}

function buildCurrentIncidentTitle(timeline: OperatorIncidentTimeline): string {
  if (timeline.summary.advisoryReached) {
    return 'Current incident (advisory ready)'
  }
  const readyEntry = timeline.entries.find(
    (e) => e.stage === 'incident-ready' || e.stage === 'advisory-projected'
  )
  if (readyEntry?.headline) {
    return readyEntry.headline
  }
  return 'Current incident'
}
