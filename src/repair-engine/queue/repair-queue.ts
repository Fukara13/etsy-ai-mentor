/**
 * RE-4: Pure repair queue. Deterministic, immutable-friendly, no side effects.
 */

import type { RepairEngineEvent } from '../contracts/repair-engine-event'
import type { RepairStrategyCandidate } from '../contracts/repair-strategy-candidate'
import type { RepairLifecycleState } from '../contracts/repair-lifecycle-state'
import type { RepairItem } from './repair-item'
import type {
  RepairQueueEnqueueResult,
  RepairQueueDequeueResult,
  RepairQueueTransitionResult,
} from './repair-queue-result'

export type RepairQueueEnqueueInput = {
  readonly currentQueue: readonly RepairItem[]
  readonly id: string
  readonly normalizedEvent: RepairEngineEvent
  readonly strategyCandidates: readonly RepairStrategyCandidate[]
  readonly lifecycleState: RepairLifecycleState
  readonly createdAt: string
  readonly updatedAt: string
}

const ERR_STRATEGY_CANDIDATES_EMPTY = 'strategyCandidates must not be empty'
const ERR_DUPLICATE_ID = 'queue already contains item with same id'
const ERR_TIMESTAMPS_EMPTY = 'createdAt and updatedAt must not be empty'
const ERR_ITEM_NOT_FOUND = 'item not found'
const ERR_COMPLETE_INVALID_TRANSITION = 'complete only allows transition from processing to completed'
const ERR_BLOCK_INVALID_TRANSITION = 'block only allows transition from queued or processing to blocked'

function hasId(queue: readonly RepairItem[], id: string): boolean {
  return queue.some((i) => i.id === id)
}

export function enqueue(input: RepairQueueEnqueueInput): RepairQueueEnqueueResult {
  const { currentQueue, id, normalizedEvent, strategyCandidates, lifecycleState, createdAt, updatedAt } =
    input

  if (strategyCandidates.length === 0) {
    throw new Error(ERR_STRATEGY_CANDIDATES_EMPTY)
  }
  if (hasId(currentQueue, id)) {
    throw new Error(ERR_DUPLICATE_ID)
  }
  if (!createdAt || !updatedAt) {
    throw new Error(ERR_TIMESTAMPS_EMPTY)
  }

  const item: RepairItem = {
    id,
    eventType: normalizedEvent.type,
    normalizedEvent,
    strategyCandidates: [...strategyCandidates],
    lifecycleState,
    status: 'queued',
    createdAt,
    updatedAt,
  }

  const queue = [...currentQueue, item]
  return { queue, enqueuedItem: item }
}

export function dequeue(queue: readonly RepairItem[]): RepairQueueDequeueResult {
  const idx = queue.findIndex((i) => i.status === 'queued')
  if (idx < 0) {
    return { queue: [...queue], dequeuedItem: null }
  }

  const item = queue[idx]
  const updatedItem: RepairItem = {
    ...item,
    status: 'processing',
    updatedAt: item.updatedAt,
  }

  const newQueue = queue.map((i, j) => (j === idx ? updatedItem : i))
  return { queue: newQueue, dequeuedItem: updatedItem }
}

export function complete(
  queue: readonly RepairItem[],
  itemId: string,
  updatedAt: string
): RepairQueueTransitionResult {
  if (!updatedAt) {
    throw new Error(ERR_TIMESTAMPS_EMPTY)
  }

  const idx = queue.findIndex((i) => i.id === itemId)
  if (idx < 0) {
    throw new Error(ERR_ITEM_NOT_FOUND)
  }

  const item = queue[idx]
  if (item.status !== 'processing') {
    throw new Error(ERR_COMPLETE_INVALID_TRANSITION)
  }

  const updatedItem: RepairItem = { ...item, status: 'completed', updatedAt }
  const newQueue = queue.map((i, j) => (j === idx ? updatedItem : i))
  return { queue: newQueue, item: updatedItem }
}

export function block(
  queue: readonly RepairItem[],
  itemId: string,
  updatedAt: string
): RepairQueueTransitionResult {
  if (!updatedAt) {
    throw new Error(ERR_TIMESTAMPS_EMPTY)
  }

  const idx = queue.findIndex((i) => i.id === itemId)
  if (idx < 0) {
    throw new Error(ERR_ITEM_NOT_FOUND)
  }

  const item = queue[idx]
  if (item.status !== 'queued' && item.status !== 'processing') {
    throw new Error(ERR_BLOCK_INVALID_TRANSITION)
  }

  const updatedItem: RepairItem = { ...item, status: 'blocked', updatedAt }
  const newQueue = queue.map((i, j) => (j === idx ? updatedItem : i))
  return { queue: newQueue, item: updatedItem }
}

export function list(queue: readonly RepairItem[]): readonly RepairItem[] {
  return [...queue]
}
