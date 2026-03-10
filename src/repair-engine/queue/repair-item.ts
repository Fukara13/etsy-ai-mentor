/**
 * RE-4: Repair queue item contract.
 */

import type { RepairEngineEventType } from '../contracts/repair-engine-event-type'
import type { RepairEngineEvent } from '../contracts/repair-engine-event'
import type { RepairStrategyCandidate } from '../contracts/repair-strategy-candidate'
import type { RepairLifecycleState } from '../contracts/repair-lifecycle-state'
import type { RepairItemStatus } from './repair-item-status'

export type RepairItem = {
  readonly id: string
  readonly eventType: RepairEngineEventType
  readonly normalizedEvent: RepairEngineEvent
  readonly strategyCandidates: readonly RepairStrategyCandidate[]
  readonly lifecycleState: RepairLifecycleState
  readonly status: RepairItemStatus
  readonly createdAt: string
  readonly updatedAt: string
}
