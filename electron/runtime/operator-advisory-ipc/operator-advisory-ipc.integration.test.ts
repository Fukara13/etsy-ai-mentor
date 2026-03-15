/**
 * OC-7: Integration-style test — set projection in runtime, request via IPC, same object.
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

import { registerOperatorAdvisoryIpc } from './register-operator-advisory-ipc'
import {
  getCurrentOperatorAdvisoryProjection,
  setCurrentOperatorAdvisoryProjection,
} from '../operator-advisory-runtime'

const sampleProjection = {
  source: 'hero-runtime' as const,
  status: 'completed' as const,
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('OC-7: operator advisory IPC integration', () => {
  beforeEach(() => {
    capturedHandler = null
    setCurrentOperatorAdvisoryProjection(null)
  })

  it('handler returns same projection set in runtime store', async () => {
    setCurrentOperatorAdvisoryProjection(sampleProjection)
    registerOperatorAdvisoryIpc()
    expect(capturedHandler).not.toBeNull()
    const result = await capturedHandler!()
    expect(result).toEqual(sampleProjection)
    expect(getCurrentOperatorAdvisoryProjection()).toEqual(sampleProjection)
  })
})
