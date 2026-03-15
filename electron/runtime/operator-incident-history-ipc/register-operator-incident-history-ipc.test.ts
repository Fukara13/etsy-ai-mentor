/**
 * OC-15: Tests for operator incident history IPC handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHandle, mockReadHistory } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockReadHistory: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

vi.mock('../operator-incident-history', () => ({
  readIncidentHistorySurface: (...args: unknown[]) => mockReadHistory(...args),
}))

import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { registerOperatorIncidentHistoryIpc } from './register-operator-incident-history-ipc'
import type { OperatorIncidentHistorySurface } from '../operator-incident-history'

const sampleSurface: OperatorIncidentHistorySurface = {
  items: [],
  totalCount: 0,
  activeCount: 0,
  resolvedCount: 0,
  requiresAttentionCount: 0,
  summary: 'No incidents.',
}

describe('OC-15: operator incident history IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers handler with OPERATOR_GET_INCIDENT_HISTORY_SURFACE channel', () => {
    registerOperatorIncidentHistoryIpc()
    expect(mockHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.OPERATOR_GET_INCIDENT_HISTORY_SURFACE,
      expect.any(Function)
    )
  })

  it('returns surface from readIncidentHistorySurface', async () => {
    mockReadHistory.mockReturnValue(sampleSurface)
    registerOperatorIncidentHistoryIpc()
    const handler = mockHandle.mock.calls[0][1] as () => Promise<OperatorIncidentHistorySurface>
    const result = await handler()
    expect(mockReadHistory).toHaveBeenCalled()
    expect(result).toEqual(sampleSurface)
  })
})

