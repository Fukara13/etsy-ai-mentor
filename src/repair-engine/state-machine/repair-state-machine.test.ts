/**
 * RE-1: Repair state machine tests.
 */

import { describe, it, expect } from 'vitest'
import { REPAIR_LIFECYCLE_STATES } from '../contracts/repair-lifecycle-state'
import { REPAIR_VERDICTS } from '../contracts/repair-verdict'
import {
  shouldEscalateRepairAttempt,
  REPAIR_RETRY_LIMIT,
} from '../escalation/repair-escalation-policy'
import { RepairStateMachine } from './repair-state-machine'

describe('repair-engine contracts', () => {
  describe('lifecycle states', () => {
    it('contains all expected values', () => {
      const expected = [
        'IDLE',
        'FAILURE_DETECTED',
        'ANALYZING',
        'STRATEGY_READY',
        'AWAITING_HUMAN_REVIEW',
        'APPROVED',
        'REJECTED',
        'ESCALATED',
        'CLOSED',
      ]
      expect(REPAIR_LIFECYCLE_STATES).toEqual(expected)
    })
  })

  describe('verdicts', () => {
    it('contains all expected values', () => {
      const expected = [
        'informational',
        'needs_review',
        'safe_with_human_approval',
        'blocked',
        'escalated',
      ]
      expect(REPAIR_VERDICTS).toEqual(expected)
    })
  })
})

describe('RepairStateMachine - legal transition validation', () => {
  const sm = new RepairStateMachine()

  it('IDLE -> FAILURE_DETECTED is legal', () => {
    expect(sm.isLegalTransition('IDLE', 'FAILURE_DETECTED')).toBe(true)
  })

  it('ANALYZING -> STRATEGY_READY is legal', () => {
    expect(sm.isLegalTransition('ANALYZING', 'STRATEGY_READY')).toBe(true)
  })

  it('IDLE -> CLOSED is illegal', () => {
    expect(sm.isLegalTransition('IDLE', 'CLOSED')).toBe(false)
  })

  it('APPROVED -> ANALYZING is illegal', () => {
    expect(sm.isLegalTransition('APPROVED', 'ANALYZING')).toBe(false)
  })
})

describe('RepairStateMachine - allowed next states', () => {
  const sm = new RepairStateMachine()

  it('ANALYZING returns STRATEGY_READY and ESCALATED', () => {
    const next = sm.getAllowedNextStates('ANALYZING')
    expect(next).toHaveLength(2)
    expect(next).toContain('STRATEGY_READY')
    expect(next).toContain('ESCALATED')
  })

  it('returned array is not reused by reference between calls', () => {
    const a = sm.getAllowedNextStates('ANALYZING')
    const b = sm.getAllowedNextStates('ANALYZING')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})

describe('escalation policy', () => {
  it('attemptCount 0 => false', () => {
    expect(shouldEscalateRepairAttempt(0)).toBe(false)
  })
  it('attemptCount 2 => false', () => {
    expect(shouldEscalateRepairAttempt(2)).toBe(false)
  })
  it('attemptCount 3 => true', () => {
    expect(shouldEscalateRepairAttempt(3)).toBe(true)
  })
  it('attemptCount 5 => true', () => {
    expect(shouldEscalateRepairAttempt(5)).toBe(true)
  })
  it('attemptCount -1 => false', () => {
    expect(shouldEscalateRepairAttempt(-1)).toBe(false)
  })
  it('REPAIR_RETRY_LIMIT is 3', () => {
    expect(REPAIR_RETRY_LIMIT).toBe(3)
  })
})

describe('RepairStateMachine - evaluation / legal flow', () => {
  const sm = new RepairStateMachine()

  it('FAILURE_DETECTED -> ANALYZING => informational', () => {
    const e = sm.evaluate({
      currentState: 'FAILURE_DETECTED',
      nextState: 'ANALYZING',
    })
    expect(e.verdict).toBe('informational')
    expect(e.isLegalTransition).toBe(true)
  })

  it('ANALYZING -> STRATEGY_READY => needs_review', () => {
    const e = sm.evaluate({
      currentState: 'ANALYZING',
      nextState: 'STRATEGY_READY',
    })
    expect(e.verdict).toBe('needs_review')
    expect(e.isLegalTransition).toBe(true)
  })

  it('STRATEGY_READY -> AWAITING_HUMAN_REVIEW => safe_with_human_approval', () => {
    const e = sm.evaluate({
      currentState: 'STRATEGY_READY',
      nextState: 'AWAITING_HUMAN_REVIEW',
    })
    expect(e.verdict).toBe('safe_with_human_approval')
    expect(e.isLegalTransition).toBe(true)
  })

  it('AWAITING_HUMAN_REVIEW -> APPROVED => needs_review', () => {
    const e = sm.evaluate({
      currentState: 'AWAITING_HUMAN_REVIEW',
      nextState: 'APPROVED',
    })
    expect(e.verdict).toBe('needs_review')
    expect(e.isLegalTransition).toBe(true)
  })

  it('ESCALATED -> CLOSED => needs_review when no escalation trigger', () => {
    const e = sm.evaluate({
      currentState: 'ESCALATED',
      nextState: 'CLOSED',
      attemptCount: 0,
    })
    expect(e.verdict).toBe('needs_review')
    expect(e.isLegalTransition).toBe(true)
    expect(e.escalationTriggered).toBe(false)
  })
})

describe('RepairStateMachine - evaluation / illegal transition', () => {
  const sm = new RepairStateMachine()

  it('IDLE -> CLOSED => blocked', () => {
    const e = sm.evaluate({
      currentState: 'IDLE',
      nextState: 'CLOSED',
    })
    expect(e.verdict).toBe('blocked')
    expect(e.isLegalTransition).toBe(false)
    expect(e.reasonCodes).toContain('ILLEGAL_TRANSITION')
  })
})

describe('RepairStateMachine - evaluation / escalation trigger', () => {
  const sm = new RepairStateMachine()

  it('ANALYZING -> STRATEGY_READY with attemptCount 3 => escalated', () => {
    const e = sm.evaluate({
      currentState: 'ANALYZING',
      nextState: 'STRATEGY_READY',
      attemptCount: 3,
    })
    expect(e.verdict).toBe('escalated')
    expect(e.escalationTriggered).toBe(true)
    expect(e.reasonCodes).toContain('RETRY_LIMIT_REACHED')
    expect(e.reasonCodes).toContain('MANUAL_INTERVENTION_REQUIRED')
    expect(e.nextState).toBe('STRATEGY_READY')
  })
})

describe('RepairStateMachine - evaluation / explicit escalation state', () => {
  const sm = new RepairStateMachine()

  it('ANALYZING -> ESCALATED with attemptCount 0 => legal, verdict escalated', () => {
    const e = sm.evaluate({
      currentState: 'ANALYZING',
      nextState: 'ESCALATED',
      attemptCount: 0,
    })
    expect(e.isLegalTransition).toBe(true)
    expect(e.verdict).toBe('escalated')
    expect(e.reasonCodes).toContain('ESCALATION_STATE_ENTERED')
    expect(e.escalationTriggered).toBe(false)
  })
})

describe('RepairStateMachine - fresh reasonCodes', () => {
  const sm = new RepairStateMachine()

  it('returns fresh reasonCodes array on each evaluation', () => {
    const a = sm.evaluate({
      currentState: 'FAILURE_DETECTED',
      nextState: 'ANALYZING',
    })
    const b = sm.evaluate({
      currentState: 'FAILURE_DETECTED',
      nextState: 'ANALYZING',
    })
    expect(a.reasonCodes).not.toBe(b.reasonCodes)
    expect(a.reasonCodes).toEqual(b.reasonCodes)
  })
})
