/**
 * RE-3: Strategy candidate contract. Deterministic, no timestamps or random values.
 */

import type { RepairStrategy } from './repair-strategy'
import type { RepairEngineEventType } from './repair-engine-event-type'

export type RepairStrategyCandidate = {
  readonly strategy: RepairStrategy
  readonly reasonCodes: readonly string[]
  readonly confidence: number
  readonly sourceEventType: RepairEngineEventType
}
