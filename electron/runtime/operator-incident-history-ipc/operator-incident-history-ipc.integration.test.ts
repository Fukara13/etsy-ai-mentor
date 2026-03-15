/**
 * OC-15: Integration-style test — incident history surface is returned via IPC.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

let capturedHandler: (() => Promise<unknown>) | null = null
vi.mock('electron', () => ({
  ipcMain: {
    handle: (_ch: string, handler: () => Promise<unknown>) => {
      capturedHandler = handler
    },
  },
}))

import { registerOperatorIncidentHistoryIpc } from './register-operator-incident-history-ipc'
import { readIncidentHistorySurface } from '../operator-incident-history'

vi.mock('../operator-incident-history', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-incident-history')>()
  return {
    ...actual,
    readIncidentHistorySurface: vi.fn(() => sampleSurface),
  }
})

const sampleSurface = {
  items: [],
  totalCount: 1,
  activeCount: 1,
  resolvedCount: 0,
  requiresAttentionCount: 1,
  summary: '1 incident • 1 requires operator attention.',
}

describe('OC-15: operator incident history IPC integration', () => {
  beforeEach(() => {
    capturedHandler = null
  })

  it('handler returns surface from readIncidentHistorySurface', async () => {
    registerOperatorIncidentHistoryIpc()
    expect(capturedHandler).not.toBeNull()
    const result = await capturedHandler!()
    expect(result).toEqual(sampleSurface)
  })
})

