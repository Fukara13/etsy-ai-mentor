/**
 * OC-16: Integration-style test — timeline panel surface is returned via IPC.
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

import { registerOperatorTimelinePanelIpc } from './register-operator-timeline-panel-ipc'
import { readOperatorTimelinePanelSurface } from '../operator-timeline-panel'

const samplePanel = {
  currentIncidentKey: 'inc-1',
  hasActiveIncident: true,
  incidentTimeline: {
    hasIncident: true,
    incidentKey: 'inc-1',
    currentStage: null,
    entries: [],
    summary: { totalStages: 0, completedStages: 0, activeStage: null, advisoryReached: false },
  },
  advisoryEvolutionTimeline: {
    hasAdvisory: true,
    incidentKey: 'inc-1',
    currentStage: null,
    entries: [],
    summary: '',
  },
  decisionTimeline: {
    hasDecisionContext: true,
    incidentKey: 'inc-1',
    currentStage: 'unknown',
    entries: [],
    summary: '',
    requiresOperatorAction: true,
  },
  incidentHistory: {
    items: [],
    totalCount: 1,
    activeCount: 1,
    resolvedCount: 0,
    requiresAttentionCount: 1,
    summary: '1 incident • 1 requires operator attention.',
  },
  summary: {
    totalHistoryItems: 1,
    activeHistoryItems: 1,
    requiresOperatorActionCount: 1,
    latestDecisionAt: null,
    latestIncidentUpdateAt: null,
  },
}

vi.mock('../operator-timeline-panel', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-timeline-panel')>()
  return {
    ...actual,
    readOperatorTimelinePanelSurface: vi.fn(() => samplePanel),
  }
})

describe('OC-16: operator timeline panel IPC integration', () => {
  beforeEach(() => {
    capturedHandler = null
  })

  it('handler returns surface from readOperatorTimelinePanelSurface', async () => {
    registerOperatorTimelinePanelIpc()
    expect(capturedHandler).not.toBeNull()
    const result = await capturedHandler!()
    expect(result).toEqual(samplePanel)
  })
})

