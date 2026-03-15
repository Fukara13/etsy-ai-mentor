/**
 * OC-7: Tests for operator advisory IPC handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHandle, mockGetCurrent } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockGetCurrent: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

vi.mock('../operator-advisory-runtime', () => ({
  getCurrentOperatorAdvisoryProjection: (...args: unknown[]) => mockGetCurrent(...args),
}))

import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { registerOperatorAdvisoryIpc } from './register-operator-advisory-ipc'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [
    {
      summary: 'Summary',
      rationaleExcerpt: 'Rationale',
      confidence: 0.9,
    },
  ],
}

describe('OC-7: operator advisory IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers handler with OPERATOR_GET_ADVISORY_PROJECTION channel', () => {
    registerOperatorAdvisoryIpc()
    expect(mockHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.OPERATOR_GET_ADVISORY_PROJECTION,
      expect.any(Function)
    )
  })

  it('returns projection when present', async () => {
    mockGetCurrent.mockReturnValue(sampleProjection)
    registerOperatorAdvisoryIpc()
    const handler = mockHandle.mock.calls[0][1] as () => Promise<OperatorRuntimeAdvisoryProjection | null>
    const result = await handler()
    expect(mockGetCurrent).toHaveBeenCalled()
    expect(result).toEqual(sampleProjection)
    expect(result?.source).toBe('hero-runtime')
    expect(result?.status).toBe('completed')
    expect(Array.isArray(result?.advisorySummaries)).toBe(true)
  })

  it('returns null when absent', async () => {
    mockGetCurrent.mockReturnValue(null)
    registerOperatorAdvisoryIpc()
    const handler = mockHandle.mock.calls[0][1] as () => Promise<OperatorRuntimeAdvisoryProjection | null>
    const result = await handler()
    expect(mockGetCurrent).toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('passes through projection without remapping', async () => {
    const withFailure: OperatorRuntimeAdvisoryProjection = {
      ...sampleProjection,
      status: 'partial',
      failureSummary: 'Some failure',
    }
    mockGetCurrent.mockReturnValue(withFailure)
    registerOperatorAdvisoryIpc()
    const handler = mockHandle.mock.calls[0][1] as () => Promise<OperatorRuntimeAdvisoryProjection | null>
    const result = await handler()
    expect(result).toBe(withFailure)
    expect(result?.failureSummary).toBe('Some failure')
  })
})
