/**
 * OC-16: Tests for operator timeline panel IPC handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockHandle, mockReadPanel } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockReadPanel: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}))

vi.mock('../operator-timeline-panel', () => ({
  readOperatorTimelinePanelSurface: (...args: unknown[]) => mockReadPanel(...args),
}))

import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { registerOperatorTimelinePanelIpc } from './register-operator-timeline-panel-ipc'
import type { OperatorTimelinePanelSurface } from '../operator-timeline-panel'

const samplePanel = {
  currentIncidentKey: null,
  hasActiveIncident: false,
  incidentTimeline: {
    hasIncident: false,
    incidentKey: null,
    currentStage: null,
    entries: [],
    summary: { totalStages: 0, completedStages: 0, activeStage: null, advisoryReached: false },
  },
  advisoryEvolutionTimeline: {
    hasAdvisory: false,
    incidentKey: null,
    currentStage: null,
    entries: [],
    summary: '',
  },
  decisionTimeline: {
    hasDecisionContext: false,
    incidentKey: null,
    currentStage: 'unknown',
    entries: [],
    summary: '',
    requiresOperatorAction: false,
  },
  incidentHistory: {
    items: [],
    totalCount: 0,
    activeCount: 0,
    resolvedCount: 0,
    requiresAttentionCount: 0,
    summary: 'No incidents.',
  },
  summary: {
    totalHistoryItems: 0,
    activeHistoryItems: 0,
    requiresOperatorActionCount: 0,
    latestDecisionAt: null,
    latestIncidentUpdateAt: null,
  },
} as OperatorTimelinePanelSurface

describe('OC-16: operator timeline panel IPC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers handler with OPERATOR_GET_TIMELINE_PANEL_SURFACE channel', () => {
    registerOperatorTimelinePanelIpc()
    expect(mockHandle).toHaveBeenCalledWith(
      IPC_CHANNELS.OPERATOR_GET_TIMELINE_PANEL_SURFACE,
      expect.any(Function)
    )
  })

  it('returns panel from readOperatorTimelinePanelSurface', async () => {
    mockReadPanel.mockReturnValue(samplePanel)
    registerOperatorTimelinePanelIpc()
    const handler = mockHandle.mock.calls[0][1] as () => Promise<OperatorTimelinePanelSurface>
    const result = await handler()
    expect(mockReadPanel).toHaveBeenCalled()
    expect(result).toEqual(samplePanel)
  })
})

