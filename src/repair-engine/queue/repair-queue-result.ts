/**
 * RE-4: Result contracts for queue operations.
 */

import type { RepairItem } from './repair-item'

export type RepairQueueEnqueueResult = {
  readonly queue: readonly RepairItem[]
  readonly enqueuedItem: RepairItem
}

export type RepairQueueDequeueResult = {
  readonly queue: readonly RepairItem[]
  readonly dequeuedItem: RepairItem | null
}

export type RepairQueueTransitionResult = {
  readonly queue: readonly RepairItem[]
  readonly item: RepairItem
}
