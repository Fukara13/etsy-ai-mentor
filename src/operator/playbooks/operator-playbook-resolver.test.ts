/**
 * RE-8: Operator playbook resolver tests.
 */

import { describe, it, expect } from 'vitest'
import { OperatorPlaybookResolver } from './operator-playbook-resolver'
import type { RepairOperatorDecisionSurface } from '../../repair-engine/operator/repair-operator-decision-surface'

function makeSurface(overrides: Partial<RepairOperatorDecisionSurface>): RepairOperatorDecisionSurface {
  return {
    headline: 'Repair strategy recommended',
    summary: 'Test summary',
    analysis: 'Test analysis',
    recommendedActionType: 'apply_strategy',
    actions: [
      { type: 'apply_strategy', label: 'Apply', description: 'Apply strategy', recommended: true, destructive: false },
    ],
    riskLevel: 'medium',
    confidence: 0.85,
    reasonCodes: ['READY_FOR_STRATEGY_REVIEW'],
    operatorGuidance: ['Review before approval'],
    ...overrides,
  }
}

describe('OperatorPlaybookResolver', () => {
  const resolver = new OperatorPlaybookResolver()

  it('strategy_ready surface returns correct playbook', () => {
    const surface = makeSurface({ headline: 'Repair strategy recommended' })
    const playbook = resolver.resolve(surface)
    expect(playbook.decisionType).toBe('strategy_ready')
    expect(playbook.headline).toBe('Strategy ready for operator review')
    expect(playbook.summary).toContain('human')
    expect(playbook.escalationRule).toBeNull()
  })

  it('manual_investigation surface returns correct playbook', () => {
    const surface = makeSurface({ headline: 'Manual investigation required' })
    const playbook = resolver.resolve(surface)
    expect(playbook.decisionType).toBe('manual_investigation')
    expect(playbook.headline).toBe('Manual investigation required')
    expect(playbook.escalationRule).toBeNull()
  })

  it('insufficient_signal surface returns correct playbook', () => {
    const surface = makeSurface({ headline: 'Waiting for additional signal' })
    const playbook = resolver.resolve(surface)
    expect(playbook.decisionType).toBe('insufficient_signal')
    expect(playbook.headline).toBe('Insufficient signal for safe decision')
    expect(playbook.escalationRule).toBe('Do not approve action until stronger evidence is available.')
  })

  it('escalate surface returns correct playbook', () => {
    const surface = makeSurface({ headline: 'Escalation to human operator required' })
    const playbook = resolver.resolve(surface)
    expect(playbook.decisionType).toBe('escalate')
    expect(playbook.headline).toBe('Escalation to human authority recommended')
    expect(playbook.escalationRule).toBe('Escalate before any approval or execution-oriented follow-up.')
  })

  it('blocked surface returns correct playbook', () => {
    const surface = makeSurface({ headline: 'Repair item blocked' })
    const playbook = resolver.resolve(surface)
    expect(playbook.decisionType).toBe('blocked')
    expect(playbook.headline).toBe('Decision path blocked pending human review')
    expect(playbook.escalationRule).toBe('Blocked state must remain until explicit human review is completed.')
  })

  it('unsupported state throws error', () => {
    const surface = makeSurface({ headline: 'Unknown state' })
    expect(() => resolver.resolve(surface)).toThrow(
      'Unsupported operator decision surface state: Unknown state'
    )
  })

  it('resolve does not mutate input surface', () => {
    const surface = makeSurface({ headline: 'Repair strategy recommended' })
    const before = { ...surface, actions: [...surface.actions], reasonCodes: [...surface.reasonCodes] }
    resolver.resolve(surface)
    expect(surface.headline).toBe(before.headline)
    expect(surface.actions).toEqual(before.actions)
  })

  it('resolve produces structurally identical result for same input', () => {
    const surface = makeSurface({ headline: 'Repair strategy recommended' })
    const a = resolver.resolve(surface)
    const b = resolver.resolve(surface)
    expect(a.decisionType).toBe(b.decisionType)
    expect(a.headline).toBe(b.headline)
    expect(a.reviewChecklist.length).toBe(b.reviewChecklist.length)
    expect(a.operatorGuidance.length).toBe(b.operatorGuidance.length)
  })

  it('reviewChecklist is not empty', () => {
    const headlines = [
      'Repair strategy recommended',
      'Manual investigation required',
      'Waiting for additional signal',
      'Escalation to human operator required',
      'Repair item blocked',
    ]
    for (const headline of headlines) {
      const playbook = resolver.resolve(makeSurface({ headline }))
      expect(playbook.reviewChecklist.length).toBeGreaterThan(0)
    }
  })

  it('operatorGuidance is not empty', () => {
    const headlines = [
      'Repair strategy recommended',
      'Manual investigation required',
      'Waiting for additional signal',
      'Escalation to human operator required',
      'Repair item blocked',
    ]
    for (const headline of headlines) {
      const playbook = resolver.resolve(makeSurface({ headline }))
      expect(playbook.operatorGuidance.length).toBeGreaterThan(0)
    }
  })

  it('escalationRule is null or string as expected', () => {
    const strategyReady = resolver.resolve(makeSurface({ headline: 'Repair strategy recommended' }))
    const insufficient = resolver.resolve(makeSurface({ headline: 'Waiting for additional signal' }))
    const escalate = resolver.resolve(makeSurface({ headline: 'Escalation to human operator required' }))
    expect(strategyReady.escalationRule).toBeNull()
    expect(typeof insufficient.escalationRule).toBe('string')
    expect(insufficient.escalationRule!.length).toBeGreaterThan(0)
    expect(typeof escalate.escalationRule).toBe('string')
  })
})
