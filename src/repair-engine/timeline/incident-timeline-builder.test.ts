import { describe, expect, it } from 'vitest';
import type { AuditRecord } from '../audit/audit-record';
import { buildIncidentTimeline } from './incident-timeline-builder';

function createAuditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    recordType: 'operator_decision_recorded',
    eventType: 'operator_decision_recorded',
    decisionAction: 'approve',
    decisionSummary: ' Approved strategy ',
    decisionNotes: [' note-1 ', '   ', 'note-2'],
    recordedAt: '2026-03-11T10:00:00.000Z',
    operatorId: 'operator-1',
    sourceEventId: 'event-1',
    correlationId: 'incident-1',
    ...overrides,
  };
}

describe('buildIncidentTimeline', () => {
  it('builds a deterministic timeline from a single audit record', () => {
    const input = [createAuditRecord()];

    const result = buildIncidentTimeline(input);

    expect(result).toEqual({
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: '2026-03-11T10:00:00.000Z',
      lastUpdatedAt: '2026-03-11T10:00:00.000Z',
      status: 'open',
      entries: [
        {
          incidentId: 'incident-1',
          correlationId: 'incident-1',
          timestamp: '2026-03-11T10:00:00.000Z',
          entryType: 'operator_decision',
          summary: 'Approved strategy',
          notes: ['note-1', 'note-2'],
          sourceEventId: 'event-1',
          operatorId: 'operator-1',
        },
      ],
    });
  });

  it('sorts entries by timestamp ascending', () => {
    const input = [
      createAuditRecord({
        recordedAt: '2026-03-11T12:00:00.000Z',
        sourceEventId: 'event-2',
        decisionSummary: 'Second decision',
      }),
      createAuditRecord({
        recordedAt: '2026-03-11T09:00:00.000Z',
        sourceEventId: 'event-1',
        decisionSummary: 'First decision',
      }),
      createAuditRecord({
        recordedAt: '2026-03-11T15:00:00.000Z',
        sourceEventId: 'event-3',
        decisionSummary: 'Third decision',
      }),
    ];

    const result = buildIncidentTimeline(input);

    expect(result.startedAt).toBe('2026-03-11T09:00:00.000Z');
    expect(result.lastUpdatedAt).toBe('2026-03-11T15:00:00.000Z');
    expect(result.entries.map((entry) => entry.sourceEventId)).toEqual([
      'event-1',
      'event-2',
      'event-3',
    ]);
  });

  it('throws when input is empty', () => {
    expect(() => buildIncidentTimeline([])).toThrow(
      'Incident timeline builder requires at least one audit record.',
    );
  });

  it('throws when records do not share the same incident id', () => {
    const input = [
      createAuditRecord({ correlationId: 'incident-1' }),
      createAuditRecord({ correlationId: 'incident-2', sourceEventId: 'event-2' }),
    ];

    expect(() => buildIncidentTimeline(input)).toThrow(
      'Incident timeline builder requires all entries to share the same incidentId.',
    );
  });

  it('does not mutate input audit records', () => {
    const original: AuditRecord[] = [
      createAuditRecord({
        decisionSummary: '  Keep original summary  ',
        decisionNotes: ['  first  ', '   ', 'second  '],
      }),
    ];

    const before = JSON.parse(JSON.stringify(original));

    buildIncidentTimeline(original);

    expect(original).toEqual(before);
  });

  it('normalizes summary and notes while building entries', () => {
    const input = [
      createAuditRecord({
        decisionSummary: '   Investigate manually   ',
        decisionNotes: ['   note-a   ', '', '   ', 'note-b   '],
      }),
    ];

    const result = buildIncidentTimeline(input);

    expect(result.entries[0].summary).toBe('Investigate manually');
    expect(result.entries[0].notes).toEqual(['note-a', 'note-b']);
  });

  it('throws when recordedAt is blank', () => {
    const input = [
      createAuditRecord({
        recordedAt: '   ',
      }),
    ];

    expect(() => buildIncidentTimeline(input)).toThrow(
      'Incident timeline builder requires non-empty timestamp.',
    );
  });

  it('throws when operatorId is blank', () => {
    const input = [
      createAuditRecord({
        operatorId: '   ',
      }),
    ];

    expect(() => buildIncidentTimeline(input)).toThrow(
      'Incident timeline builder requires non-empty operatorId.',
    );
  });

  it('throws when sourceEventId is blank', () => {
    const input = [
      createAuditRecord({
        sourceEventId: '   ',
      }),
    ];

    expect(() => buildIncidentTimeline(input)).toThrow(
      'Incident timeline builder requires non-empty sourceEventId.',
    );
  });

  it('throws when decisionSummary is blank', () => {
    const input = [
      createAuditRecord({
        decisionSummary: '   ',
      }),
    ];

    expect(() => buildIncidentTimeline(input)).toThrow(
      'Incident timeline builder requires non-empty summary.',
    );
  });
});

