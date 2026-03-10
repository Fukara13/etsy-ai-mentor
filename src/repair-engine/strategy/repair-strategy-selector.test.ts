/**
 * RE-3: Strategy selector tests.
 */

import { describe, it, expect } from 'vitest'
import { selectRepairStrategyCandidates } from './repair-strategy-selector'
import type { RepairEngineEvent } from '../contracts/repair-engine-event'

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

describe('selectRepairStrategyCandidates', () => {
  describe('CI_FAILURE', () => {
    it('returns deterministic candidates', () => {
      const event = makeEvent('CI_FAILURE')
      const a = selectRepairStrategyCandidates(event)
      const b = selectRepairStrategyCandidates(event)
      expect(a).toHaveLength(2)
      expect(b).toHaveLength(2)
      expect(a[0].strategy.type).toBe('test_fix')
      expect(a[1].strategy.type).toBe('dependency_fix')
      expect(a[0].confidence).toBe(0.85)
      expect(a[1].confidence).toBe(0.72)
    })

    it('primary candidate is test_fix with TEST_REPAIR_CANDIDATE_SELECTED', () => {
      const result = selectRepairStrategyCandidates(makeEvent('CI_FAILURE'))
      const testFix = result.find((c) => c.strategy.type === 'test_fix')
      expect(testFix).toBeDefined()
      expect(testFix!.reasonCodes).toContain('TEST_REPAIR_CANDIDATE_SELECTED')
      expect(testFix!.reasonCodes).toContain('HUMAN_APPROVAL_REQUIRED')
    })

    it('secondary candidate is dependency_fix', () => {
      const result = selectRepairStrategyCandidates(makeEvent('CI_FAILURE'))
      const depFix = result.find((c) => c.strategy.type === 'dependency_fix')
      expect(depFix).toBeDefined()
    })
  })

  describe('PR_UPDATED', () => {
    it('returns deterministic candidates', () => {
      const event = makeEvent('PR_UPDATED')
      const result = selectRepairStrategyCandidates(event)
      expect(result).toHaveLength(1)
      expect(result[0].strategy.type).toBe('configuration_fix')
      expect(result[0].confidence).toBe(0.80)
    })

    it('includes CONFIGURATION_REVIEW_RECOMMENDED', () => {
      const result = selectRepairStrategyCandidates(makeEvent('PR_UPDATED'))
      expect(result[0].reasonCodes).toContain('CONFIGURATION_REVIEW_RECOMMENDED')
      expect(result[0].reasonCodes).toContain('HUMAN_APPROVAL_REQUIRED')
    })
  })

  describe('MANUAL_ANALYSIS_REQUESTED', () => {
    it('returns deterministic candidates', () => {
      const event = makeEvent('MANUAL_ANALYSIS_REQUESTED')
      const result = selectRepairStrategyCandidates(event)
      expect(result).toHaveLength(1)
      expect(result[0].strategy.type).toBe('manual_investigation')
      expect(result[0].confidence).toBe(0.90)
    })

    it('includes MANUAL_ANALYSIS_PATH_REQUIRED', () => {
      const result = selectRepairStrategyCandidates(makeEvent('MANUAL_ANALYSIS_REQUESTED'))
      expect(result[0].reasonCodes).toContain('MANUAL_ANALYSIS_PATH_REQUIRED')
      expect(result[0].reasonCodes).toContain('HUMAN_APPROVAL_REQUIRED')
    })
  })

  describe('human review and approval', () => {
    it('all returned strategies require human review', () => {
      const events = [
        makeEvent('CI_FAILURE'),
        makeEvent('PR_UPDATED'),
        makeEvent('MANUAL_ANALYSIS_REQUESTED'),
      ]
      for (const event of events) {
        const candidates = selectRepairStrategyCandidates(event)
        for (const c of candidates) {
          expect(c.strategy.needsHumanReview).toBe(true)
        }
      }
    })

    it('all returned strategies are blocked by human approval', () => {
      const events = [
        makeEvent('CI_FAILURE'),
        makeEvent('PR_UPDATED'),
        makeEvent('MANUAL_ANALYSIS_REQUESTED'),
      ]
      for (const event of events) {
        const candidates = selectRepairStrategyCandidates(event)
        for (const c of candidates) {
          expect(c.strategy.blockedByHumanApproval).toBe(true)
        }
      }
    })
  })

  describe('immutability', () => {
    it('does not mutate input event', () => {
      const event = makeEvent('CI_FAILURE')
      const before = { ...event, metadata: event.metadata ? { ...event.metadata } : undefined }
      selectRepairStrategyCandidates(event)
      expect(event).toEqual(before)
    })

    it('returns fresh arrays - no shared references between calls', () => {
      const event = makeEvent('CI_FAILURE')
      const a = selectRepairStrategyCandidates(event)
      const b = selectRepairStrategyCandidates(event)
      expect(a).not.toBe(b)
      expect(a[0].reasonCodes).not.toBe(b[0].reasonCodes)
    })
  })

  describe('determinism', () => {
    it('confidence values are stable across calls', () => {
      const event = makeEvent('CI_FAILURE')
      const a = selectRepairStrategyCandidates(event)
      const b = selectRepairStrategyCandidates(event)
      expect(a[0].confidence).toBe(b[0].confidence)
      expect(a[1].confidence).toBe(b[1].confidence)
    })

    it('reason codes are present and meaningful', () => {
      const result = selectRepairStrategyCandidates(makeEvent('MANUAL_ANALYSIS_REQUESTED'))
      expect(result[0].reasonCodes.length).toBeGreaterThan(0)
      expect(result[0].reasonCodes.every((r) => typeof r === 'string' && r.length > 0)).toBe(true)
    })
  })
})
