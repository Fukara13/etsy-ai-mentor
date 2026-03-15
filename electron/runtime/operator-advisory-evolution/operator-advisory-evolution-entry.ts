/**
 * OC-12: Single entry in the operator advisory evolution timeline.
 */

import type { OperatorAdvisoryEvolutionStage } from './operator-advisory-evolution-stage'

export const ADVISORY_EVOLUTION_ENTRY_STATUSES = [
  'completed',
  'active',
  'not-reached',
  'unknown',
] as const

export type OperatorAdvisoryEvolutionEntryStatus = (typeof ADVISORY_EVOLUTION_ENTRY_STATUSES)[number]

export interface OperatorAdvisoryEvolutionEntry {
  readonly stage: OperatorAdvisoryEvolutionStage
  readonly status: OperatorAdvisoryEvolutionEntryStatus
  readonly order: number
  readonly headline: string
  readonly detail: string
  readonly hasAdvisoryImpact: boolean
}
