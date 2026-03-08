/**
 * DC-9: Decision view mapper tests.
 */

import { describe, it, expect } from 'vitest'
import { mapDecisionViewModel } from './decision-view.mapper'
import type { DecisionView } from '../../shared/read-models'

describe('mapDecisionViewModel', () => {
  it('maps full input correctly', () => {
    const input: DecisionView = {
      id: 'd1',
      traceId: 't1',
      gptAnalysisTitle: 'Root Cause',
      gptAnalysisBody: 'The failure appears related to a missing dependency in the repair step.',
      repairStrategyTitle: 'Recommended Strategy',
      repairStrategyBody: 'Update the dependency definition and rerun validation in a controlled review flow.',
      riskLevel: 'MEDIUM',
      operatorPrompt: 'Review the AI recommendation before deciding the next manual step.',
    }
    const out = mapDecisionViewModel(input)
    expect(out.heading).toBe('Human Decision Console')
    expect(out.gptAnalysis.title).toBe('Root Cause')
    expect(out.gptAnalysis.body).toBe('The failure appears related to a missing dependency in the repair step.')
    expect(out.repairStrategy.title).toBe('Recommended Strategy')
    expect(out.repairStrategy.body).toContain('Update the dependency definition')
    expect(out.riskLevel).toBe('MEDIUM')
    expect(out.operatorPrompt).toBe('Review the AI recommendation before deciding the next manual step.')
    expect(out.options).toHaveLength(3)
    expect(out.options.map((o) => o.id)).toEqual(['approve', 'reject', 'escalate'])
  })

  it('returns fallback when input is null', () => {
    const out = mapDecisionViewModel(null)
    expect(out.heading).toBe('Human Decision Console')
    expect(out.gptAnalysis.body).toBe('No GPT analysis available.')
    expect(out.repairStrategy.body).toBe('No repair strategy available.')
    expect(out.riskLevel).toBe('UNKNOWN')
    expect(out.operatorPrompt).toBe('Review the AI output and choose the next human action.')
    expect(out.options).toHaveLength(3)
  })

  it('normalizes risk levels', () => {
    expect(mapDecisionViewModel(decisionWithRisk('low')).riskLevel).toBe('LOW')
    expect(mapDecisionViewModel(decisionWithRisk('LOW')).riskLevel).toBe('LOW')
    expect(mapDecisionViewModel(decisionWithRisk('medium')).riskLevel).toBe('MEDIUM')
    expect(mapDecisionViewModel(decisionWithRisk('Medium')).riskLevel).toBe('MEDIUM')
    expect(mapDecisionViewModel(decisionWithRisk('high')).riskLevel).toBe('HIGH')
    expect(mapDecisionViewModel(decisionWithRisk('critical')).riskLevel).toBe('HIGH')
    expect(mapDecisionViewModel(decisionWithRisk('')).riskLevel).toBe('UNKNOWN')
    expect(mapDecisionViewModel(decisionWithRisk(undefined)).riskLevel).toBe('UNKNOWN')
  })

  it('always returns exactly 3 options: approve, reject, escalate', () => {
    const out = mapDecisionViewModel(null)
    const ids = out.options.map((o) => o.id)
    expect(ids).toEqual(['approve', 'reject', 'escalate'])
    expect(out.options[0].label).toBe('Approve Strategy')
    expect(out.options[1].label).toBe('Reject Strategy')
    expect(out.options[2].label).toBe('Escalate to Manual')
  })
})

function decisionWithRisk(riskLevel: string | undefined): DecisionView {
  return {
    id: 'd1',
    traceId: 't1',
    riskLevel,
  }
}
