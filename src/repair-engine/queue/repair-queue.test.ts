/**
 * RE-4: Repair queue tests.
 */

import { describe, it, expect } from 'vitest'
import {
  enqueue,
  dequeue,
  complete,
  block,
  list,
  type RepairQueueEnqueueInput,
} from './repair-queue'
import { selectRepairStrategyCandidates } from '../strategy/repair-strategy-selector'
import type { RepairEngineEvent } from '../contracts/repair-engine-event'
function makeEvent(
  type: RepairEngineEvent['type'],
  overrides?: Partial<RepairEngineEvent>
): RepairEngineEvent {
  return {
    type,
    source: type === 'CI_FAILURE' ? 'ci' : type === 'PR_UPDATED' ? 'pull_request' : 'human',
    subjectId: 'test-subject',
    summary: 'Test summary',
    attemptCount: 0,
    ...overrides,
  }
}

function makeEnqueueInput(overrides?: Partial<RepairQueueEnqueueInput>): RepairQueueEnqueueInput {
  const event = makeEvent('CI_FAILURE')
  const candidates = selectRepairStrategyCandidates(event)
  return {
    currentQueue: [],
    id: 'item-1',
    normalizedEvent: event,
    strategyCandidates: candidates,
    lifecycleState: 'FAILURE_DETECTED',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('enqueue', () => {
  it('creates a queued repair item', () => {
    const result = enqueue(makeEnqueueInput())
    expect(result.enqueuedItem.status).toBe('queued')
    expect(result.enqueuedItem.id).toBe('item-1')
  })

  it('appends item to queue tail', () => {
    const first = enqueue(makeEnqueueInput({ id: 'a' }))
    const second = enqueue({
      ...makeEnqueueInput({ id: 'b' }),
      currentQueue: first.queue,
    })
    expect(second.queue).toHaveLength(2)
    expect(second.queue[0].id).toBe('a')
    expect(second.queue[1].id).toBe('b')
  })

  it('derives eventType from normalized event', () => {
    const event = makeEvent('PR_UPDATED')
    const candidates = selectRepairStrategyCandidates(event)
    const result = enqueue({
      ...makeEnqueueInput(),
      normalizedEvent: event,
      strategyCandidates: candidates,
    })
    expect(result.enqueuedItem.eventType).toBe('PR_UPDATED')
  })

  it('rejects duplicate ids', () => {
    const first = enqueue(makeEnqueueInput())
    expect(() =>
      enqueue({
        ...makeEnqueueInput({ id: 'item-1' }),
        currentQueue: first.queue,
      })
    ).toThrow('queue already contains item with same id')
  })

  it('rejects empty strategyCandidates', () => {
    expect(() =>
      enqueue(makeEnqueueInput({ strategyCandidates: [] }))
    ).toThrow('strategyCandidates must not be empty')
  })

  it('rejects empty createdAt or updatedAt', () => {
    expect(() => enqueue(makeEnqueueInput({ createdAt: '' }))).toThrow(
      'createdAt and updatedAt must not be empty'
    )
    expect(() => enqueue(makeEnqueueInput({ updatedAt: '' }))).toThrow(
      'createdAt and updatedAt must not be empty'
    )
  })
})

describe('dequeue', () => {
  it('moves first queued item to processing', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const result = dequeue(queue)
    expect(result.dequeuedItem).not.toBeNull()
    expect(result.dequeuedItem!.status).toBe('processing')
  })

  it('preserves FIFO order', () => {
    let q = enqueue(makeEnqueueInput({ id: 'a' })).queue
    q = enqueue({ ...makeEnqueueInput({ id: 'b' }), currentQueue: q }).queue
    const d1 = dequeue(q)
    expect(d1.dequeuedItem!.id).toBe('a')
    const d2 = dequeue(d1.queue)
    expect(d2.dequeuedItem!.id).toBe('b')
  })

  it('does not remove item from queue', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const result = dequeue(queue)
    expect(result.queue).toHaveLength(1)
    expect(result.queue[0].id).toBe('a')
    expect(result.queue[0].status).toBe('processing')
  })

  it('returns null when no queued item exists', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const d1 = dequeue(queue)
    const d2 = dequeue(d1.queue)
    expect(d2.dequeuedItem).toBeNull()
    expect(d2.queue).toEqual(d1.queue)
  })
})

describe('complete', () => {
  it('transitions processing -> completed', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const { queue: q2 } = dequeue(queue)
    const result = complete(q2, 'a', '2024-01-01T00:01:00Z')
    expect(result.item.status).toBe('completed')
    expect(result.item.updatedAt).toBe('2024-01-01T00:01:00Z')
  })

  it('rejects unknown item id', () => {
    const { queue } = enqueue(makeEnqueueInput())
    expect(() => complete(queue, 'unknown-id', '2024-01-01T00:01:00Z')).toThrow('item not found')
  })

  it('rejects invalid transition', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    expect(() => complete(queue, 'a', '2024-01-01T00:01:00Z')).toThrow(
      'complete only allows transition from processing to completed'
    )
  })
})

describe('block', () => {
  it('transitions queued -> blocked', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const result = block(queue, 'a', '2024-01-01T00:01:00Z')
    expect(result.item.status).toBe('blocked')
  })

  it('transitions processing -> blocked', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const { queue: q2 } = dequeue(queue)
    const result = block(q2, 'a', '2024-01-01T00:01:00Z')
    expect(result.item.status).toBe('blocked')
  })

  it('rejects invalid transitions from completed', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const { queue: q2 } = dequeue(queue)
    const { queue: q3 } = complete(q2, 'a', '2024-01-01T00:01:00Z')
    expect(() => block(q3, 'a', '2024-01-01T00:02:00Z')).toThrow(
      'block only allows transition from queued or processing to blocked'
    )
  })

  it('rejects invalid transitions from blocked', () => {
    const { queue } = enqueue(makeEnqueueInput({ id: 'a' }))
    const { queue: q2 } = block(queue, 'a', '2024-01-01T00:01:00Z')
    expect(() => block(q2, 'a', '2024-01-01T00:02:00Z')).toThrow(
      'block only allows transition from queued or processing to blocked'
    )
  })
})

describe('list', () => {
  it('returns queue safely without mutating original', () => {
    const { queue } = enqueue(makeEnqueueInput())
    const listed = list(queue)
    expect(listed).toEqual(queue)
    expect(listed).not.toBe(queue)
  })
})

describe('queue operations preserve other items', () => {
  it('dequeue does not change other items', () => {
    let q = enqueue(makeEnqueueInput({ id: 'a' })).queue
    q = enqueue({ ...makeEnqueueInput({ id: 'b' }), currentQueue: q }).queue
    const { queue } = dequeue(q)
    const b = queue.find((i) => i.id === 'b')!
    expect(b.status).toBe('queued')
  })

  it('complete does not change other items', () => {
    let q = enqueue(makeEnqueueInput({ id: 'a' })).queue
    q = enqueue({ ...makeEnqueueInput({ id: 'b' }), currentQueue: q }).queue
    const { queue: q2 } = dequeue(q)
    const { queue } = complete(q2, 'a', '2024-01-01T00:01:00Z')
    const b = queue.find((i) => i.id === 'b')!
    expect(b.status).toBe('queued')
  })
})

describe('determinism', () => {
  it('requires external id and timestamp inputs', () => {
    const input = makeEnqueueInput({
      id: 'external-id-123',
      createdAt: '2024-06-15T12:00:00Z',
      updatedAt: '2024-06-15T12:00:00Z',
    })
    const result = enqueue(input)
    expect(result.enqueuedItem.id).toBe('external-id-123')
    expect(result.enqueuedItem.createdAt).toBe('2024-06-15T12:00:00Z')
  })
})
