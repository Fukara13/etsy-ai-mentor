import { describe, it, expect } from 'vitest';
import { recordAuditTrail } from './repair-audit-trail-recorder';
import type { AuditRecordInput } from './audit-record-input';

function createInput(
  overrides: Partial<AuditRecordInput> = {}
): AuditRecordInput {
  return {
    decisionResult: {
      event: {
        type: 'operator_decision_recorded',
        payload: {
          action: 'approve',
          summary: '  Approve strategy  ',
          notes: [' first note ', '   ', 'second note'],
        },
      },
    } as AuditRecordInput['decisionResult'],
    recordedAt: '2026-03-11T12:00:00.000Z',
    operatorId: 'operator-1',
    sourceEventId: 'source-event-1',
    correlationId: 'correlation-1',
    ...overrides,
  };
}

describe('recordAuditTrail', () => {
  it('records approve decision correctly', () => {
    const input = createInput();

    const result = recordAuditTrail(input);

    expect(result).toEqual({
      record: {
        recordType: 'operator_decision_recorded',
        eventType: 'operator_decision_recorded',
        decisionAction: 'approve',
        decisionSummary: 'Approve strategy',
        decisionNotes: ['first note', 'second note'],
        recordedAt: '2026-03-11T12:00:00.000Z',
        operatorId: 'operator-1',
        sourceEventId: 'source-event-1',
        correlationId: 'correlation-1',
      },
    });
  });

  it('records reject decision correctly', () => {
    const decisionResult = {
      event: {
        type: 'operator_decision_recorded',
        payload: {
          action: 'reject',
          summary: ' Reject plan ',
          notes: [' not safe '],
        },
      },
    } as AuditRecordInput['decisionResult'];

    const input = createInput({
      decisionResult,
    });

    const result = recordAuditTrail(input);

    expect(result.record.decisionAction).toBe('reject');
    expect(result.record.decisionSummary).toBe('Reject plan');
    expect(result.record.decisionNotes).toEqual(['not safe']);
  });

  it('trims summary and notes and removes empty notes', () => {
    const decisionResult = {
      event: {
        type: 'operator_decision_recorded',
        payload: {
          action: 'approve',
          summary: '  Clean me  ',
          notes: ['  alpha  ', '', '   ', ' beta '],
        },
      },
    } as AuditRecordInput['decisionResult'];

    const input = createInput({
      decisionResult,
    });

    const result = recordAuditTrail(input);

    expect(result.record.decisionSummary).toBe('Clean me');
    expect(result.record.decisionNotes).toEqual(['alpha', 'beta']);
  });

  it('preserves deterministic output shape', () => {
    const input = createInput();

    const result = recordAuditTrail(input);

    expect(Object.keys(result)).toEqual(['record']);
    expect(Object.keys(result.record)).toEqual([
      'recordType',
      'eventType',
      'decisionAction',
      'decisionSummary',
      'decisionNotes',
      'recordedAt',
      'operatorId',
      'sourceEventId',
      'correlationId',
    ]);
  });

  it('throws when input is missing', () => {
    expect(() => recordAuditTrail(undefined as unknown as AuditRecordInput)).toThrow();
  });

  it('throws when decisionResult is missing', () => {
    const input = {
      recordedAt: '2026-03-11T12:00:00.000Z',
      operatorId: 'operator-1',
      sourceEventId: 'source-event-1',
      correlationId: 'correlation-1',
    } as AuditRecordInput;

    expect(() => recordAuditTrail(input)).toThrow();
  });

  it('throws when recordedAt is blank', () => {
    const input = createInput({ recordedAt: '   ' });

    expect(() => recordAuditTrail(input)).toThrow();
  });

  it('throws when operatorId is blank', () => {
    const input = createInput({ operatorId: '   ' });

    expect(() => recordAuditTrail(input)).toThrow();
  });

  it('throws when sourceEventId is blank', () => {
    const input = createInput({ sourceEventId: '   ' });

    expect(() => recordAuditTrail(input)).toThrow();
  });

  it('throws when correlationId is blank', () => {
    const input = createInput({ correlationId: '   ' });

    expect(() => recordAuditTrail(input)).toThrow();
  });

  it('does not mutate input', () => {
    const input = createInput();
    const snapshot = JSON.parse(JSON.stringify(input));

    recordAuditTrail(input);

    expect(input).toEqual(snapshot);
  });
});
