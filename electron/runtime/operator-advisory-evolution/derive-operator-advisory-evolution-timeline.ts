/**
 * OC-12: Pure derivation of operator advisory evolution timeline from advisory view.
 * No I/O; deterministic.
 */

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorAdvisoryEvolutionTimeline } from './operator-advisory-evolution-timeline'
import type { OperatorAdvisoryEvolutionStage } from './operator-advisory-evolution-stage'
import { mapRuntimeStateToAdvisoryEvolutionStage } from './map-runtime-state-to-advisory-evolution-stage'
import { createOperatorAdvisoryEvolutionEntries } from './create-operator-advisory-evolution-entries'

function buildSummary(
  hasAdvisory: boolean,
  currentStage: OperatorAdvisoryEvolutionStage | null
): string {
  if (currentStage == null) {
    return 'No advisory evolution data is currently available.'
  }
  switch (currentStage) {
    case 'hero-analysis':
      return 'Advisory is currently in hero analysis.'
    case 'governance-evaluated':
      return 'Governance has been evaluated for the advisory.'
    case 'bridge-path-derived':
      return 'Advisory path explanation has been derived.'
    case 'advisory-generated':
      return 'Advisory has been generated.'
    case 'operator-view-ready':
      return 'Advisory has been prepared for operator review.'
    default:
      return 'Advisory evolution in progress.'
  }
}

export function deriveOperatorAdvisoryEvolutionTimeline(
  advisoryView: OperatorAdvisoryView
): OperatorAdvisoryEvolutionTimeline {
  const hasAdvisory = advisoryView.hasAdvisory
  const currentStage = mapRuntimeStateToAdvisoryEvolutionStage(advisoryView)
  const entries = createOperatorAdvisoryEvolutionEntries(currentStage, advisoryView)
  const summary = buildSummary(hasAdvisory, currentStage)

  return {
    hasAdvisory,
    incidentKey: null,
    currentStage,
    entries,
    summary,
  }
}
