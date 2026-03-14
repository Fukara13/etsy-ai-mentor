/**
 * OC-1: Tests for trigger repair run IPC handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHandle, mockRemoveHandler } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}))

import { TRIGGER_REPAIR_RUN } from './repair-ipc-command'
import { registerTriggerRepairRunHandler } from './trigger-repair-run-ipc'
import { triggerRepairRun } from '../../desktop/engine-backed-provider'
import * as engineProvider from '../../desktop/engine-backed-provider'

const mockInput = {
  initialState: 'ANALYZE' as const,
  retryCount: 0,
  sessionId: 'test-session-1',
}

const mockOutcome = {
  sessionId: 'test-session-1',
  initialState: 'ANALYZE' as const,
  finalState: 'HUMAN' as const,
  totalSteps: 1,
  visitedPath: ['ANALYZE', 'HUMAN'] as const,
  halted: false,
  terminal: true,
  requiresHuman: true,
  exhaustionReached: false,
  terminationReason: 'requires_human' as const,
  lastTransitionEvent: 'ORCHESTRATION_COMPLETED',
  lastActor: 'RepairEngineOrchestrator',
  startedAt: '2000-01-01T00:00:00.000Z',
  endedAt: '2000-01-01T00:00:01.000Z',
}

describe('OC-1: trigger repair run IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers IPC handler with TRIGGER_REPAIR_RUN channel', () => {
    registerTriggerRepairRunHandler()
    expect(mockHandle).toHaveBeenCalledWith(TRIGGER_REPAIR_RUN, expect.any(Function))
  })

  it('handler calls triggerRepairRun and returns outcome', async () => {
    const triggerSpy = vi.spyOn(engineProvider, 'triggerRepairRun').mockReturnValue(mockOutcome)
    registerTriggerRepairRunHandler()
    const handlerFn = mockHandle.mock.calls[0][1] as (event: unknown, input: typeof mockInput) => Promise<unknown>
    const result = await handlerFn(null, mockInput)
    expect(triggerSpy).toHaveBeenCalledWith(mockInput)
    expect(result).toEqual(mockOutcome)
    triggerSpy.mockRestore()
  })

  it('engine-backed-provider triggerRepairRun is invoked by handler', async () => {
    const triggerSpy = vi.spyOn(engineProvider, 'triggerRepairRun').mockReturnValue(mockOutcome)
    registerTriggerRepairRunHandler()
    const handlerFn = mockHandle.mock.calls[0][1] as (event: unknown, input: typeof mockInput) => Promise<unknown>
    await handlerFn(null, mockInput)
    expect(triggerSpy).toHaveBeenCalledTimes(1)
    triggerSpy.mockRestore()
  })

  it('triggerRepairRun returns structured RepairRunOutcome', () => {
    const outcome = triggerRepairRun(mockInput)
    expect(outcome).toBeDefined()
    expect(outcome).toHaveProperty('sessionId')
    expect(outcome).toHaveProperty('initialState', 'ANALYZE')
    expect(outcome).toHaveProperty('finalState')
    expect(outcome).toHaveProperty('totalSteps')
    expect(outcome).toHaveProperty('visitedPath')
    expect(outcome).toHaveProperty('requiresHuman')
    expect(outcome).toHaveProperty('startedAt')
    expect(outcome).toHaveProperty('endedAt')
    expect(typeof outcome.sessionId).toBe('string')
    expect(Array.isArray(outcome.visitedPath)).toBe(true)
  })

  it('structured result has RepairRunOutcome shape', () => {
    const outcome = triggerRepairRun(mockInput)
    expect(outcome.sessionId).toBeDefined()
    expect(outcome.finalState).toBeDefined()
    expect(outcome.totalSteps).toBeGreaterThanOrEqual(0)
    expect(outcome.visitedPath.length).toBeGreaterThanOrEqual(1)
    expect(typeof outcome.requiresHuman).toBe('boolean')
    expect(typeof outcome.startedAt).toBe('string')
    expect(typeof outcome.endedAt).toBe('string')
  })
})
