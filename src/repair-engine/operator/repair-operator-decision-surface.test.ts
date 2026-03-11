/**
 * RE-7: Operator decision surface builder tests.
 */

import { describe, it, expect } from 'vitest'
import { buildRepairOperatorDecisionSurface } from './repair-operator-decision-surface-builder'
import type { RepairOperatorDecision } from '../routing/repair-operator-decision'

function makeDecision(overrides: Partial<RepairOperatorDecision>): RepairOperatorDecision {
  return {
    repairItemId: 'item-1',
    verdict: 'strategy_ready',
    summary: 'Test summary',
    riskLevel: 'medium',
    confidence: 0.85,
    reasonCodes: ['READY_FOR_STRATEGY_REVIEW'],
    actions: [
      {
        id: 'apply_strategy',
        label: 'Apply recommended strategy',
        description: 'Apply the suggested repair strategy after review.',
        actionType: 'apply_strategy',
        recommended: true,
      },
      {
        id: 'investigate_manually',
        label: 'Investigate manually',
        description: 'Conduct manual investigation instead.',
        actionType: 'investigate_manually',
        recommended: false,
      },
    ],
    ...overrides,
  }
}

describe('buildRepairOperatorDecisionSurface', () => {
  it('apply_strategy → recommended strategy surface', () => {
    const decision = makeDecision({
      verdict: 'strategy_ready',
      actions: [
        { id: 'a', label: 'Apply', description: 'Apply strategy', actionType: 'apply_strategy', recommended: true },
        { id: 'b', label: 'Investigate', description: 'Manual', actionType: 'investigate_manually', recommended: false },
      ],
    })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.recommendedActionType).toBe('apply_strategy')
    expect(surface.headline).toBe('Repair strategy recommended')
    expect(surface.operatorGuidance).toContain('Review the proposed repair strategy before approval.')
    expect(surface.actions.some((a) => a.type === 'apply_strategy' && a.recommended)).toBe(true)
  })

  it('investigate_manually → manual investigation surface', () => {
    const decision = makeDecision({
      verdict: 'manual_investigation',
      actions: [
        { id: 'a', label: 'Investigate', description: 'Manual', actionType: 'investigate_manually', recommended: true },
      ],
    })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.recommendedActionType).toBe('investigate_manually')
    expect(surface.headline).toBe('Manual investigation required')
    expect(surface.operatorGuidance).toContain('Manual investigation recommended. Inspect logs and test output.')
  })

  it('wait_for_signal → wait guidance surface', () => {
    const decision = makeDecision({
      verdict: 'insufficient_signal',
      actions: [
        { id: 'a', label: 'Wait', description: 'Wait', actionType: 'wait_for_signal', recommended: true },
        { id: 'b', label: 'Investigate', description: 'Manual', actionType: 'investigate_manually', recommended: false },
      ],
    })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.recommendedActionType).toBe('wait_for_signal')
    expect(surface.headline).toBe('Waiting for additional signal')
    expect(surface.operatorGuidance).toContain('System recommends waiting for additional signals.')
  })

  it('escalate_to_human → escalation surface', () => {
    const decision = makeDecision({
      verdict: 'escalate',
      actions: [
        { id: 'a', label: 'Escalate', description: 'Escalate', actionType: 'escalate_to_human', recommended: true },
      ],
    })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.recommendedActionType).toBe('escalate_to_human')
    expect(surface.headline).toBe('Escalation to human operator required')
    expect(surface.operatorGuidance).toContain('Escalation required due to high uncertainty.')
    expect(surface.actions.find((a) => a.type === 'escalate_to_human')!.destructive).toBe(true)
  })

  it('reason codes pass through unchanged', () => {
    const reasonCodes = ['CODE_A', 'CODE_B']
    const decision = makeDecision({ reasonCodes })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.reasonCodes).toEqual(['CODE_A', 'CODE_B'])
    expect(surface.reasonCodes).not.toBe(reasonCodes)
  })

  it('confidence value remains unchanged', () => {
    const decision = makeDecision({ confidence: 0.92 })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.confidence).toBe(0.92)
  })

  it('risk level remains unchanged', () => {
    const decision = makeDecision({ riskLevel: 'high' })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.riskLevel).toBe('high')
  })

  it('produces deterministic output for same input', () => {
    const decision = makeDecision({ verdict: 'blocked' })
    const a = buildRepairOperatorDecisionSurface(decision)
    const b = buildRepairOperatorDecisionSurface(decision)
    expect(a.headline).toBe(b.headline)
    expect(a.recommendedActionType).toBe(b.recommendedActionType)
    expect(a.operatorGuidance).toEqual(b.operatorGuidance)
  })

  it('does not mutate input decision', () => {
    const decision = makeDecision({ verdict: 'strategy_ready' })
    const before = { ...decision, actions: [...decision.actions] }
    buildRepairOperatorDecisionSurface(decision)
    expect(decision.repairItemId).toBe(before.repairItemId)
    expect(decision.actions).toEqual(before.actions)
  })

  it('returns consistent decision surface structure', () => {
    const decision = makeDecision({})
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface).toHaveProperty('headline')
    expect(surface).toHaveProperty('summary')
    expect(surface).toHaveProperty('analysis')
    expect(surface).toHaveProperty('recommendedActionType')
    expect(surface).toHaveProperty('actions')
    expect(surface).toHaveProperty('riskLevel')
    expect(surface).toHaveProperty('confidence')
    expect(surface).toHaveProperty('reasonCodes')
    expect(surface).toHaveProperty('operatorGuidance')
    expect(Array.isArray(surface.actions)).toBe(true)
    expect(Array.isArray(surface.operatorGuidance)).toBe(true)
  })

  it('blocked verdict → blocked headline', () => {
    const decision = makeDecision({
      verdict: 'blocked',
      actions: [
        { id: 'a', label: 'Investigate', description: 'Investigate', actionType: 'investigate_manually', recommended: true },
        { id: 'b', label: 'Escalate', description: 'Escalate', actionType: 'escalate_to_human', recommended: false },
      ],
    })
    const surface = buildRepairOperatorDecisionSurface(decision)
    expect(surface.headline).toBe('Repair item blocked')
  })
})
