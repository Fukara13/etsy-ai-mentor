/**
 * OC-12: Canonical read entry for operator advisory evolution timeline.
 * Uses existing operator advisory view; read-only.
 */

import { readOperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorAdvisoryEvolutionTimeline } from './operator-advisory-evolution-timeline'
import { deriveOperatorAdvisoryEvolutionTimeline } from './derive-operator-advisory-evolution-timeline'

export function readOperatorAdvisoryEvolutionTimeline(): OperatorAdvisoryEvolutionTimeline {
  const advisoryView = readOperatorAdvisoryView()
  return deriveOperatorAdvisoryEvolutionTimeline(advisoryView)
}
