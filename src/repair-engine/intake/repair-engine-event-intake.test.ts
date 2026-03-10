/**
 * RE-2: Event intake tests.
 */

import { describe, it, expect } from 'vitest'
import { RepairEngineEventIntake } from './repair-engine-event-intake'
import type { RepairEngineEventInput } from './repair-engine-event-intake'

describe('RepairEngineEventIntake - valid scenarios', () => {
  const intake = new RepairEngineEventIntake()

  it('accepts CI_FAILURE and recommends FAILURE_DETECTED', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: 'job-123',
      summary: 'Build failed',
    })
    expect(result.accepted).toBe(true)
    expect(result.normalizedEvent).toBeDefined()
    expect(result.normalizedEvent?.type).toBe('CI_FAILURE')
    expect(result.normalizedEvent?.source).toBe('ci')
    expect(result.recommendedInitialState).toBe('FAILURE_DETECTED')
    expect(result.reasonCodes).toContain('CI_FAILURE_RECEIVED')
  })

  it('accepts PR_UPDATED and recommends ANALYZING', () => {
    const result = intake.intake({
      type: 'PR_UPDATED',
      subjectId: 'pr-456',
      summary: 'PR updated',
    })
    expect(result.accepted).toBe(true)
    expect(result.recommendedInitialState).toBe('ANALYZING')
    expect(result.reasonCodes).toContain('PR_UPDATED_RECEIVED')
  })

  it('accepts MANUAL_ANALYSIS_REQUESTED and recommends ANALYZING', () => {
    const result = intake.intake({
      type: 'MANUAL_ANALYSIS_REQUESTED',
      subjectId: 'req-789',
      summary: 'Manual analysis requested',
    })
    expect(result.accepted).toBe(true)
    expect(result.recommendedInitialState).toBe('ANALYZING')
    expect(result.reasonCodes).toContain('MANUAL_ANALYSIS_REQUEST_RECEIVED')
  })

  it('returns fresh arrays on each call - no shared mutable references', () => {
    const input: RepairEngineEventInput = {
      type: 'CI_FAILURE',
      subjectId: 'job-1',
      summary: 'Build failed',
    }
    const a = intake.intake(input)
    const b = intake.intake(input)
    expect(a.reasonCodes).not.toBe(b.reasonCodes)
    expect(a.validationErrors).not.toBe(b.validationErrors)
    expect(a.reasonCodes).toEqual(b.reasonCodes)
  })
})

describe('RepairEngineEventIntake - invalid scenarios', () => {
  const intake = new RepairEngineEventIntake()

  it('rejects empty subjectId', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: '',
      summary: 'Build failed',
    })
    expect(result.accepted).toBe(false)
    expect(result.validationErrors).toContain('subjectId must be non-empty')
  })

  it('rejects whitespace-only subjectId', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: '   ',
      summary: 'Build failed',
    })
    expect(result.accepted).toBe(false)
  })

  it('rejects empty summary', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: 'job-1',
      summary: '',
    })
    expect(result.accepted).toBe(false)
    expect(result.validationErrors).toContain('summary must be non-empty')
  })

  it('rejects negative attemptCount', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: 'job-1',
      summary: 'Build failed',
      attemptCount: -1,
    })
    expect(result.accepted).toBe(false)
    expect(result.validationErrors).toContain('attemptCount must be non-negative')
  })

  it('rejects unsupported event type', () => {
    const result = intake.intake({
      type: 'UNKNOWN_EVENT',
      subjectId: 'job-1',
      summary: 'Build failed',
    })
    expect(result.accepted).toBe(false)
    expect(result.validationErrors.some((e) => e.includes('unsupported'))).toBe(true)
  })

  it('preserves deterministic output for same input', () => {
    const input: RepairEngineEventInput = {
      type: 'PR_UPDATED',
      subjectId: 'pr-1',
      summary: 'Updated',
    }
    const a = intake.intake(input)
    const b = intake.intake(input)
    expect(a.accepted).toBe(b.accepted)
    expect(a.recommendedInitialState).toBe(b.recommendedInitialState)
    expect(a.reasonCodes).toEqual(b.reasonCodes)
  })
})

describe('RepairEngineEventIntake - normalization', () => {
  const intake = new RepairEngineEventIntake()

  it('trims subjectId and summary', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: '  job-1  ',
      summary: '  Build failed  ',
    })
    expect(result.accepted).toBe(true)
    expect(result.normalizedEvent?.subjectId).toBe('job-1')
    expect(result.normalizedEvent?.summary).toBe('Build failed')
  })

  it('uses default attemptCount 0 when omitted', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: 'job-1',
      summary: 'Build failed',
    })
    expect(result.normalizedEvent?.attemptCount).toBe(0)
  })

  it('passes through metadata when provided', () => {
    const result = intake.intake({
      type: 'CI_FAILURE',
      subjectId: 'job-1',
      summary: 'Build failed',
      metadata: { branch: 'main', runId: 42 },
    })
    expect(result.normalizedEvent?.metadata).toEqual({ branch: 'main', runId: 42 })
  })
})
