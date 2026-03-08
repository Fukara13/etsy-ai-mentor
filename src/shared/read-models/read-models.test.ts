/**
 * DC-3: Contract integrity tests for read models.
 */

import { describe, it, expect } from 'vitest'
import {
  mockRepairRunView,
  mockStateMachineView,
  mockFailureTimelineView,
  mockGptAnalysisView,
  mockRepairStrategyView,
  mockTelemetryView,
} from './mocks'

const VALID_VIEW_STATUSES = ['idle', 'running', 'completed', 'failed', 'exhausted', 'human_required']
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical']

describe('read-model contract integrity', () => {
  it('mockRepairRunView has required fields', () => {
    expect(mockRepairRunView).toHaveProperty('id')
    expect(mockRepairRunView).toHaveProperty('traceId')
    expect(mockRepairRunView).toHaveProperty('status')
    expect(mockRepairRunView).toHaveProperty('startedAt')
    expect(mockRepairRunView).toHaveProperty('summary')
    expect(typeof mockRepairRunView.id).toBe('string')
    expect(typeof mockRepairRunView.traceId).toBe('string')
    expect(typeof mockRepairRunView.startedAt).toBe('number')
  })

  it('mockRepairRunView status is valid ViewStatus', () => {
    expect(VALID_VIEW_STATUSES).toContain(mockRepairRunView.status)
  })

  it('mockStateMachineView has required fields', () => {
    expect(mockStateMachineView).toHaveProperty('id')
    expect(mockStateMachineView).toHaveProperty('currentState')
    expect(mockStateMachineView).toHaveProperty('nodes')
    expect(Array.isArray(mockStateMachineView.nodes)).toBe(true)
  })

  it('mockFailureTimelineView has events array', () => {
    expect(mockFailureTimelineView).toHaveProperty('events')
    expect(Array.isArray(mockFailureTimelineView.events)).toBe(true)
    for (const e of mockFailureTimelineView.events) {
      expect(e).toHaveProperty('id')
      expect(e).toHaveProperty('timestamp')
      expect(e).toHaveProperty('label')
      expect(e).toHaveProperty('type')
    }
  })

  it('mockGptAnalysisView has required fields and valid risk', () => {
    expect(mockGptAnalysisView).toHaveProperty('failureType')
    expect(mockGptAnalysisView).toHaveProperty('rootCause')
    expect(mockGptAnalysisView).toHaveProperty('suggestedFix')
    expect(mockGptAnalysisView).toHaveProperty('findings')
    expect(VALID_SEVERITIES).toContain(mockGptAnalysisView.risk)
    expect(mockGptAnalysisView.confidence).toBeGreaterThanOrEqual(0)
    expect(mockGptAnalysisView.confidence).toBeLessThanOrEqual(1)
  })

  it('mockRepairStrategyView has required fields', () => {
    expect(mockRepairStrategyView).toHaveProperty('handoffIntent')
    expect(mockRepairStrategyView).toHaveProperty('nextAction')
    expect(mockRepairStrategyView).toHaveProperty('operatorMessage')
    expect(mockRepairStrategyView).toHaveProperty('steps')
    expect(VALID_VIEW_STATUSES).toContain(mockRepairStrategyView.status)
  })

  it('mockTelemetryView has required fields', () => {
    expect(mockTelemetryView).toHaveProperty('metrics')
    expect(Array.isArray(mockTelemetryView.metrics)).toBe(true)
    expect(mockTelemetryView).toHaveProperty('runCount')
    expect(typeof mockTelemetryView.runCount).toBe('number')
  })
})
