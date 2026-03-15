/**
 * OC-12: Canonical operator advisory evolution timeline projection.
 */

import type { OperatorAdvisoryEvolutionStage } from './operator-advisory-evolution-stage'
import type { OperatorAdvisoryEvolutionEntry } from './operator-advisory-evolution-entry'

export interface OperatorAdvisoryEvolutionTimeline {
  readonly hasAdvisory: boolean
  readonly incidentKey: string | null
  readonly currentStage: OperatorAdvisoryEvolutionStage | null
  readonly entries: readonly OperatorAdvisoryEvolutionEntry[]
  readonly summary: string
}
