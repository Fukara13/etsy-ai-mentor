/**
 * DC-7: Analysis view mapper tests.
 * Pure function behavior; safe fallbacks.
 */

import { describe, it, expect } from 'vitest'
import { mapGPTAnalysisViewModel, mapRepairStrategyViewModel } from './analysis-view.mapper'
import type { GPTAnalysisView, RepairStrategyView } from '../../shared/read-models'

describe('mapGPTAnalysisViewModel', () => {
  it('maps valid input correctly', () => {
    const input: GPTAnalysisView = {
      id: 'g1',
      traceId: 't1',
      failureType: 'TypeScript compile error',
      rootCause: 'Missing type import in module X',
      suggestedFix: 'Add the missing type import',
      risk: 'low',
      confidence: 0.92,
      findings: [
        { id: 'f1', title: 'T1', severity: 'low', summary: 's1', evidence: 'src/services/order.ts' },
        { id: 'f2', title: 'T2', severity: 'low', summary: 's2', evidence: 'src/types/order.types.ts' },
      ],
      analyzedAt: 1709900015,
    }
    const out = mapGPTAnalysisViewModel(input)
    expect(out.title).toBe('GPT Analysis')
    expect(out.failureType).toBe('TypeScript compile error')
    expect(out.rootCause).toBe('Missing type import in module X')
    expect(out.confidence).toBe('High')
    expect(out.affectedFiles).toEqual(['src/services/order.ts', 'src/types/order.types.ts'])
    expect(out.summary).toBe('Suggested fix: Add the missing type import')
    expect(out.status).toBe('ready')
  })

  it('returns safe empty-state view model when input is null', () => {
    const out = mapGPTAnalysisViewModel(null)
    expect(out.title).toBe('GPT Analysis')
    expect(out.failureType).toBe('')
    expect(out.rootCause).toBe('')
    expect(out.confidence).toBe('')
    expect(out.affectedFiles).toEqual([])
    expect(out.status).toBe('empty')
  })

  it('preserves deterministic ordering for affectedFiles', () => {
    const input: GPTAnalysisView = {
      id: 'g1',
      traceId: 't1',
      failureType: 'F',
      rootCause: 'R',
      suggestedFix: '',
      risk: 'low',
      confidence: 0.5,
      findings: [
        { id: 'a', title: 'A', severity: 'low', summary: '', evidence: 'file-c.ts' },
        { id: 'b', title: 'B', severity: 'low', summary: '', evidence: 'file-a.ts' },
        { id: 'c', title: 'C', severity: 'low', summary: '', evidence: 'file-b.ts' },
      ],
      analyzedAt: 0,
    }
    const out = mapGPTAnalysisViewModel(input)
    expect(out.affectedFiles).toEqual(['file-c.ts', 'file-a.ts', 'file-b.ts'])
  })

  it('uses findings title when evidence is missing', () => {
    const input: GPTAnalysisView = {
      id: 'g1',
      traceId: 't1',
      failureType: 'F',
      rootCause: 'R',
      suggestedFix: '',
      risk: 'low',
      confidence: 0.7,
      findings: [{ id: 'f1', title: 'foo.ts', severity: 'low', summary: 's' }],
      analyzedAt: 0,
    }
    const out = mapGPTAnalysisViewModel(input)
    expect(out.affectedFiles).toContain('foo.ts')
  })

  it('maps confidence levels correctly', () => {
    expect(mapGPTAnalysisViewModel({ ...validGPTInput(), confidence: 0.95 }).confidence).toBe('High')
    expect(mapGPTAnalysisViewModel({ ...validGPTInput(), confidence: 0.75 }).confidence).toBe('Medium')
    expect(mapGPTAnalysisViewModel({ ...validGPTInput(), confidence: 0.5 }).confidence).toBe('Low')
  })
})

function validGPTInput(): GPTAnalysisView {
  return {
    id: 'g1',
    traceId: 't1',
    failureType: 'F',
    rootCause: 'R',
    suggestedFix: '',
    risk: 'low',
    confidence: 0.8,
    findings: [],
    analyzedAt: 0,
  }
}

describe('mapRepairStrategyViewModel', () => {
  it('maps valid input correctly', () => {
    const input: RepairStrategyView = {
      id: 's1',
      traceId: 't1',
      handoffIntent: 'review',
      nextAction: 'Review suggested fix and decide',
      operatorMessage: 'Repair exhausted; human review required.',
      steps: [
        { id: 's1', label: 'Analyze', status: 'completed', summary: 'Add the missing type import' },
        { id: 's2', label: 'Verify', status: 'pending', summary: 'Re-run type check' },
      ],
      status: 'human_required',
      updatedAt: 1709900060,
    }
    const out = mapRepairStrategyViewModel(input)
    expect(out.title).toBe('Repair Strategy')
    expect(out.proposedSteps).toEqual(['Add the missing type import', 'Re-run type check'])
    expect(out.expectedResult).toBe('Review suggested fix and decide')
    expect(out.notes).toBe('Repair exhausted; human review required.')
    expect(out.status).toBe('ready')
  })

  it('returns safe empty-state view model when input is null', () => {
    const out = mapRepairStrategyViewModel(null)
    expect(out.title).toBe('Repair Strategy')
    expect(out.proposedSteps).toEqual([])
    expect(out.expectedResult).toBe('')
    expect(out.status).toBe('empty')
  })

  it('preserves deterministic ordering for proposedSteps', () => {
    const input: RepairStrategyView = {
      id: 's1',
      traceId: 't1',
      handoffIntent: '',
      nextAction: 'Done',
      operatorMessage: '',
      steps: [
        { id: '1', label: 'L1', status: 'completed', summary: 'Step A' },
        { id: '2', label: 'L2', status: 'pending', summary: 'Step B' },
        { id: '3', label: 'L3', status: 'pending', summary: 'Step C' },
      ],
      status: 'running',
      updatedAt: 0,
    }
    const out = mapRepairStrategyViewModel(input)
    expect(out.proposedSteps).toEqual(['Step A', 'Step B', 'Step C'])
  })

  it('falls back to label when summary is empty', () => {
    const input: RepairStrategyView = {
      id: 's1',
      traceId: 't1',
      handoffIntent: '',
      nextAction: 'Done',
      operatorMessage: '',
      steps: [{ id: '1', label: 'Label Only', status: 'completed' }],
      status: 'completed',
      updatedAt: 0,
    }
    const out = mapRepairStrategyViewModel(input)
    expect(out.proposedSteps).toContain('Label Only')
  })
})
