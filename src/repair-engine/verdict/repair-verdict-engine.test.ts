/**
 * RE-5: Verdict engine tests.
 */

import { describe, it, expect } from 'vitest'
import { evaluateRepairItemForVerdict } from './repair-verdict-engine'
import type { RepairEvaluationInput } from '../contracts/repair-evaluation-input'
import type { RepairItem } from '../queue/repair-item'
import type { RepairEngineEvent } from '../contracts/repair-engine-event'
import { selectRepairStrategyCandidates } from '../strategy/repair-strategy-selector'
import { STRATEGY_MANUAL_INVESTIGATION } from '../strategy/repair-strategy-catalog'
import type { RepairStrategyCandidate } from '../contracts/repair-strategy-candidate'

function makeEvent(
  type: RepairEngineEvent['type'],
  overrides?: Partial<RepairEngineEvent>
): RepairEngineEvent {
  return {
    type,
    source: type === 'CI_FAILURE' ? 'ci' : type === 'PR_UPDATED' ? 'pull_request' : 'human',
    subjectId: 'test-subject',
    summary: 'Test summary',
    attemptCount: 0,
    ...overrides,
  }
}

function makeItem(overrides: Partial<RepairItem>): RepairItem {
  const event = makeEvent('CI_FAILURE')
  const candidates = selectRepairStrategyCandidates(event)
  return {
    id: 'item-1',
    eventType: 'CI_FAILURE',
    normalizedEvent: event,
    strategyCandidates: candidates,
    lifecycleState: 'FAILURE_DETECTED',
    status: 'processing',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeManualCandidate(): RepairStrategyCandidate {
  return {
    strategy: STRATEGY_MANUAL_INVESTIGATION,
    reasonCodes: ['MANUAL_ANALYSIS_PATH_REQUIRED'],
    confidence: 0.9,
    sourceEventType: 'MANUAL_ANALYSIS_REQUESTED',
  }
}

function makeSingleConfigCandidate(): RepairStrategyCandidate[] {
  const event = makeEvent('PR_UPDATED')
  return selectRepairStrategyCandidates(event)
}

describe('evaluateRepairItemForVerdict', () => {
  it('returns blocked when item status is queued', () => {
    const item = makeItem({ status: 'queued' })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('blocked')
    expect(result.evaluation.reasonCodes).toContain('ITEM_NOT_PROCESSING')
  })

  it('returns blocked when item status is completed', () => {
    const item = makeItem({ status: 'completed' })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('blocked')
    expect(result.evaluation.reasonCodes).toContain('ITEM_ALREADY_TERMINAL')
  })

  it('returns blocked when item status is blocked', () => {
    const item = makeItem({ status: 'blocked' })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('blocked')
    expect(result.evaluation.reasonCodes).toContain('ITEM_ALREADY_TERMINAL')
  })

  it('returns insufficient_signal when processing item has zero strategy candidates', () => {
    const item = makeItem({ status: 'processing', strategyCandidates: [] })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('insufficient_signal')
    expect(result.evaluation.reasonCodes).toContain('NO_STRATEGY_CANDIDATES')
    expect(result.evaluation.dominantStrategyType).toBeNull()
  })

  it('returns manual_investigation when processing item includes manual_investigation strategy', () => {
    const item = makeItem({
      status: 'processing',
      strategyCandidates: [makeManualCandidate()],
    })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('manual_investigation')
    expect(result.evaluation.dominantStrategyType).toBe('manual_investigation')
    expect(result.evaluation.reasonCodes).toContain('MANUAL_STRATEGY_PRESENT')
  })

  it('returns strategy_ready when processing item has exactly one non-manual strategy', () => {
    const candidates = makeSingleConfigCandidate()
    const item = makeItem({
      status: 'processing',
      normalizedEvent: makeEvent('PR_UPDATED'),
      eventType: 'PR_UPDATED',
      strategyCandidates: candidates,
    })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('strategy_ready')
    expect(result.evaluation.dominantStrategyType).toBe('configuration_fix')
    expect(result.recommendedStrategyType).toBe('configuration_fix')
    expect(result.evaluation.reasonCodes).toContain('READY_FOR_STRATEGY_REVIEW')
    expect(result.evaluation.confidenceLevel).toBe('high')
  })

  it('returns manual_investigation when processing item has multiple strategy candidates', () => {
    const event = makeEvent('CI_FAILURE')
    const candidates = selectRepairStrategyCandidates(event)
    const item = makeItem({
      status: 'processing',
      strategyCandidates: candidates,
    })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.verdict).toBe('manual_investigation')
    expect(result.evaluation.dominantStrategyType).toBeNull()
    expect(result.evaluation.reasonCodes).toContain('MULTIPLE_STRATEGIES_PRESENT')
  })

  it('preserves deterministic output for the same input', () => {
    const item = makeItem({ status: 'processing' })
    const a = evaluateRepairItemForVerdict({ item })
    const b = evaluateRepairItemForVerdict({ item })
    expect(a.verdict).toBe(b.verdict)
    expect(a.evaluation.confidence).toBe(b.evaluation.confidence)
    expect(a.evaluation.reasonCodes).toEqual(b.evaluation.reasonCodes)
    expect(a.evaluation.summary).toBe(b.evaluation.summary)
  })

  it('exposes reason codes and summary', () => {
    const item = makeItem({ status: 'processing' })
    const result = evaluateRepairItemForVerdict({ item })
    expect(result.evaluation.reasonCodes.length).toBeGreaterThan(0)
    expect(typeof result.evaluation.summary).toBe('string')
    expect(result.evaluation.summary.length).toBeGreaterThan(0)
  })

  it('returns recommendedStrategyType only when verdict is strategy_ready', () => {
    const single = makeItem({
      status: 'processing',
      strategyCandidates: makeSingleConfigCandidate(),
    })
    const multi = makeItem({ status: 'processing' })
    const singleResult = evaluateRepairItemForVerdict({ item: single })
    const multiResult = evaluateRepairItemForVerdict({ item: multi })
    expect(singleResult.verdict).toBe('strategy_ready')
    expect(singleResult.recommendedStrategyType).toBe('configuration_fix')
    expect(multiResult.verdict).toBe('manual_investigation')
    expect(multiResult.recommendedStrategyType).toBeNull()
  })

  it('propagates confidence and confidenceLevel from FR-4 derivation', () => {
    const single = makeItem({
      status: 'processing',
      strategyCandidates: makeSingleConfigCandidate(),
    })
    const result = evaluateRepairItemForVerdict({ item: single })
    expect(typeof result.evaluation.confidence).toBe('number')
    expect(result.evaluation.confidence).toBeGreaterThanOrEqual(0)
    expect(result.evaluation.confidence).toBeLessThanOrEqual(1)
    expect(['low', 'medium', 'high']).toContain(result.evaluation.confidenceLevel)
  })

  it('does not mutate the input item', () => {
    const item = makeItem({ status: 'processing' })
    const before = { ...item, strategyCandidates: [...item.strategyCandidates] }
    evaluateRepairItemForVerdict({ item })
    expect(item).toEqual(before)
  })
})
