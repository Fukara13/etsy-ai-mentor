import { describe, it, expect } from 'vitest';
import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import { buildIncidentSummary } from './incident-summary-builder';

function createEntry(overrides: Partial<IncidentTimelineEntry> = {}): IncidentTimelineEntry {
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
  const entries: IncidentTimelineEntry[] = [
    createEntry(),
    createEntry({
      timestamp: '2026-03-11T11:00:00.000Z',
      sourceEventId: 'event-2',
    }),
  ];

  return {
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    startedAt: entries[0].timestamp,
    lastUpdatedAt: entries[1].timestamp,
    status: 'open',
    entries,
    ...overrides,
  };
}

describe('buildIncidentSummary', () => {
  it('builds summary from populated timeline', () => {
    const timeline = createTimeline();

    const summary = buildIncidentSummary(timeline);

    expect(summary.incidentId).toBe('incident-1');
    expect(summary.timelineEventCount).toBe(2);
    expect(summary.firstEventType).toBe('operator_decision');
    expect(summary.lastEventType).toBe('operator_decision');
    expect(summary.firstEventTimestamp).toBe('2026-03-11T10:00:00.000Z');
    expect(summary.lastEventTimestamp).toBe('2026-03-11T11:00:00.000Z');
  });

  it('handles single event timeline', () => {
    const entry = createEntry();
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: entry.timestamp,
      lastUpdatedAt: entry.timestamp,
      status: 'open',
      entries: [entry],
    };

    const summary = buildIncidentSummary(timeline);

    expect(summary.timelineEventCount).toBe(1);
    expect(summary.firstEventType).toBe('operator_decision');
    expect(summary.lastEventType).toBe('operator_decision');
    expect(summary.firstEventTimestamp).toBe(entry.timestamp);
    expect(summary.lastEventTimestamp).toBe(entry.timestamp);
  });

  it('handles empty timeline', () => {
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: '2026-03-11T10:00:00.000Z',
      lastUpdatedAt: '2026-03-11T10:00:00.000Z',
      status: 'open',
      entries: [],
    };

    const summary = buildIncidentSummary(timeline);

    expect(summary.timelineEventCount).toBe(0);
    expect(summary.firstEventType).toBeNull();
    expect(summary.lastEventType).toBeNull();
    expect(summary.firstEventTimestamp).toBeNull();
    expect(summary.lastEventTimestamp).toBeNull();
  });

  it('does not mutate input IncidentTimeline', () => {
    const timeline = createTimeline();
    const snapshot = JSON.parse(JSON.stringify(timeline));

    buildIncidentSummary(timeline);

    expect(timeline).toEqual(snapshot);
  });
});

