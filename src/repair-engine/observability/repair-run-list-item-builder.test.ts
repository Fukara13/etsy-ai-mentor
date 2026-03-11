import { describe, it, expect } from 'vitest';
import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import type { RepairRun } from '../run/repair-run';
import { buildRepairRunListItem } from './repair-run-list-item-builder';

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

describe('buildRepairRunListItem', () => {
  it('builds list item from populated run timeline', () => {
    const run = createRun();

    const listItem = buildRepairRunListItem(run);

    expect(listItem.runId).toBe('run-incident-1');
    expect(listItem.incidentId).toBe('incident-1');
    expect(listItem.status).toBe('running');
    expect(listItem.startedAt).toBe('2026-03-11T10:00:00.000Z');
    expect(listItem.finishedAt).toBe('2026-03-11T10:00:00.000Z');
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

    const listItem = buildRepairRunListItem(run);

    expect(listItem.timelineEventCount).toBe(2);
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

    const listItem = buildRepairRunListItem(run);

    expect(listItem.lastEventType).toBe('operator_decision');
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

    const listItem = buildRepairRunListItem(run);

    expect(listItem.timelineEventCount).toBe(0);
    expect(listItem.lastEventType).toBeNull();
  });

  it('does not mutate input RepairRun', () => {
    const run = createRun();
    const snapshot = JSON.parse(JSON.stringify(run));

    buildRepairRunListItem(run);

    expect(run).toEqual(snapshot);
  });
});

