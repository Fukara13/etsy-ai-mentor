/**
 * RE-6: Verdict router tests.
 */

import { describe, it, expect } from 'vitest'
import { RepairVerdictRouter } from './repair-verdict-router'
import type { RepairVerdictResult } from '../contracts/repair-verdict-result'
import type { RepairEvaluation } from '../contracts/repair-evaluation'

function makeVerdictResult(
  verdict: RepairVerdictResult['verdict'],
  overrides?: Partial<RepairVerdictResult>
): RepairVerdictResult {
  const evaluation: RepairEvaluation = {
    itemId: 'item-1',
    status: 'processing',
    lifecycleState: 'FAILURE_DETECTED',
    strategyCount: 1,
    dominantStrategyType: 'test_fix',
    riskLevel: 'medium',
    confidence: 0.85,
    reasonCodes: ['READY_FOR_STRATEGY_REVIEW'],
    summary: 'Test summary',
  }
  return {
    verdict,
    evaluation,
    recommendedStrategyType: 'test_fix',
    ...overrides,
  }
}

describe('RepairVerdictRouter', () => {
  const router = new RepairVerdictRouter()

  it('strategy_ready → includes apply_strategy and recommends it', () => {
    const result = router.route(
      makeVerdictResult('strategy_ready', { recommendedStrategyType: 'configuration_fix' })
    )
    expect(result.verdict).toBe('strategy_ready')
    const applyStrategy = result.actions.find((a) => a.actionType === 'apply_strategy')
    expect(applyStrategy).toBeDefined()
    expect(applyStrategy!.recommended).toBe(true)
    expect(result.recommendedStrategyType).toBe('configuration_fix')
  })

  it('manual_investigation → recommends investigate_manually', () => {
    const result = router.route(makeVerdictResult('manual_investigation'))
    expect(result.verdict).toBe('manual_investigation')
    const investigate = result.actions.find((a) => a.actionType === 'investigate_manually')
    expect(investigate).toBeDefined()
    expect(investigate!.recommended).toBe(true)
  })

  it('blocked → includes escalate_to_human', () => {
    const result = router.route(makeVerdictResult('blocked'))
    expect(result.verdict).toBe('blocked')
    const escalate = result.actions.find((a) => a.actionType === 'escalate_to_human')
    expect(escalate).toBeDefined()
    const investigate = result.actions.find((a) => a.actionType === 'investigate_manually')
    expect(investigate).toBeDefined()
    expect(investigate!.recommended).toBe(true)
  })

  it('insufficient_signal → includes wait_for_signal', () => {
    const result = router.route(makeVerdictResult('insufficient_signal'))
    expect(result.verdict).toBe('insufficient_signal')
    const wait = result.actions.find((a) => a.actionType === 'wait_for_signal')
    expect(wait).toBeDefined()
    expect(wait!.recommended).toBe(true)
  })

  it('escalate → recommends escalate_to_human', () => {
    const result = router.route(makeVerdictResult('escalate'))
    expect(result.verdict).toBe('escalate')
    const escalate = result.actions.find((a) => a.actionType === 'escalate_to_human')
    expect(escalate).toBeDefined()
    expect(escalate!.recommended).toBe(true)
  })

  it('maps summary, riskLevel, confidence correctly', () => {
    const verdictResult = makeVerdictResult('strategy_ready', {
      evaluation: {
        itemId: 'item-42',
        status: 'processing',
        lifecycleState: 'ANALYZING',
        strategyCount: 1,
        dominantStrategyType: 'test_fix',
        riskLevel: 'high',
        confidence: 0.9,
        reasonCodes: ['READY_FOR_STRATEGY_REVIEW'],
        summary: 'Custom summary text',
      },
    })
    const result = router.route(verdictResult)
    expect(result.repairItemId).toBe('item-42')
    expect(result.summary).toBe('Custom summary text')
    expect(result.riskLevel).toBe('high')
    expect(result.confidence).toBe(0.9)
  })

  it('omits recommendedStrategyType when null', () => {
    const result = router.route(
      makeVerdictResult('manual_investigation', { recommendedStrategyType: null })
    )
    expect(result.recommendedStrategyType).toBeUndefined()
  })
})
