import { describe, it, expect } from 'vitest';
import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import type { RepairRun } from '../run/repair-run';
import { buildRepairRunSummary } from './repair-run-summary-builder';

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

function createRun(overrides: Partial<RepairRun> = {}): RepairRun {
  const timeline = createTimeline();

  return {
    runId: 'run-incident-1',
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    startedAt: timeline.startedAt,
    lastUpdatedAt: timeline.lastUpdatedAt,
    status: 'running',
    timeline,
    ...overrides,
  };
}

describe('buildRepairRunSummary', () => {
  it('builds summary from populated timeline', () => {
    const run = createRun();

    const summary = buildRepairRunSummary(run);

    expect(summary.runId).toBe('run-incident-1');
    expect(summary.incidentId).toBe('incident-1');
    expect(summary.status).toBe('running');
    expect(summary.startedAt).toBe('2026-03-11T10:00:00.000Z');
    expect(summary.lastUpdatedAt).toBe('2026-03-11T10:00:00.000Z');
  });

  it('computes correct event count', () => {
    const entries: IncidentTimelineEntry[] = [
      createEntry({ sourceEventId: 'event-1' }),
      createEntry({ sourceEventId: 'event-2', timestamp: '2026-03-11T11:00:00.000Z' }),
    ];
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: entries[0].timestamp,
      lastUpdatedAt: entries[1].timestamp,
      status: 'open',
      entries,
    };
    const run = createRun({ timeline, lastUpdatedAt: timeline.lastUpdatedAt });

    const summary = buildRepairRunSummary(run);

    expect(summary.timelineEventCount).toBe(2);
  });

  it('extracts last event type', () => {
    const entries: IncidentTimelineEntry[] = [
      createEntry({ entryType: 'operator_decision' }),
      createEntry({ entryType: 'operator_decision', timestamp: '2026-03-11T11:00:00.000Z' }),
    ];
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: entries[0].timestamp,
      lastUpdatedAt: entries[1].timestamp,
      status: 'open',
      entries,
    };
    const run = createRun({ timeline, lastUpdatedAt: timeline.lastUpdatedAt });

    const summary = buildRepairRunSummary(run);

    expect(summary.lastEventType).toBe('operator_decision');
  });

  it('handles empty timeline correctly', () => {
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: '2026-03-11T10:00:00.000Z',
      lastUpdatedAt: '2026-03-11T10:00:00.000Z',
      status: 'open',
      entries: [],
    };
    const run = createRun({ timeline });

    const summary = buildRepairRunSummary(run);

    expect(summary.timelineEventCount).toBe(0);
    expect(summary.lastEventType).toBeNull();
  });

  it('does not mutate input RepairRun', () => {
    const run = createRun();
    const snapshot = JSON.parse(JSON.stringify(run));

    buildRepairRunSummary(run);

    expect(run).toEqual(snapshot);
  });
});

