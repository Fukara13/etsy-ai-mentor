import { describe, it, expect } from 'vitest';

import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';

import { buildRepairRun } from './repair-run-builder';

function createEntry(
  overrides: Partial<IncidentTimelineEntry> = {}
): IncidentTimelineEntry {
  return {
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    timestamp: '2026-03-11T10:00:00.000Z',
    entryType: 'operator_decision',
    summary: 'approved',
    notes: [],
    sourceEventId: 'event-1',
    operatorId: 'operator-1',
    ...overrides,
  };
}

function createTimeline(
  overrides: Partial<IncidentTimeline> = {}
): IncidentTimeline {
  const entry = createEntry();

  return {
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    startedAt: entry.timestamp,
    lastUpdatedAt: entry.timestamp,
    status: 'open',
    entries: [entry],
    ...overrides,
  };
}

describe('buildRepairRun', () => {
  it('builds a repair run from timeline', () => {
    const timeline = createTimeline();

    const result = buildRepairRun(timeline);

    expect(result.runId).toBe('run-incident-1');
    expect(result.incidentId).toBe('incident-1');
    expect(result.correlationId).toBe('incident-1');
    expect(result.status).toBe('running');
    expect(result.timeline).toBe(timeline);
  });

  it('throws when incidentId is blank', () => {
    const timeline = createTimeline({
      incidentId: '   ',
    });

    expect(() => buildRepairRun(timeline)).toThrow(
      'RepairRun builder requires non-empty incidentId.'
    );
  });

  it('throws when correlationId is blank', () => {
    const timeline = createTimeline({
      correlationId: '   ',
    });

    expect(() => buildRepairRun(timeline)).toThrow(
      'RepairRun builder requires non-empty correlationId.'
    );
  });

  it('throws when startedAt is blank', () => {
    const timeline = createTimeline({
      startedAt: '   ',
    });

    expect(() => buildRepairRun(timeline)).toThrow(
      'RepairRun builder requires non-empty startedAt.'
    );
  });

  it('throws when lastUpdatedAt is blank', () => {
    const timeline = createTimeline({
      lastUpdatedAt: '   ',
    });

    expect(() => buildRepairRun(timeline)).toThrow(
      'RepairRun builder requires non-empty lastUpdatedAt.'
    );
  });
});

