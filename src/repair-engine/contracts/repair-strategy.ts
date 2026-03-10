/**
 * RE-3: Repair strategy contract. Immutable-friendly, side-effect free.
 */

import type { RepairStrategyType } from './repair-strategy-type'
import type { RepairEngineEventType } from './repair-engine-event-type'

export type RepairStrategy = {
  readonly id: string
  readonly type: RepairStrategyType
  readonly title: string
  readonly description: string
  readonly rationale: string
  readonly suggestedActions: readonly string[]
  readonly applicableEventTypes: readonly RepairEngineEventType[]
  readonly needsHumanReview: true
  readonly blockedByHumanApproval: true
}
