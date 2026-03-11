import { describe, it, expect } from 'vitest';
import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import type { RepairRun } from '../run/repair-run';
import { buildIncidentHistorySummary } from './incident-history-summary-builder';

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

describe('buildIncidentHistorySummary', () => {
  it('builds summary for multiple runs respecting provided ordering', () => {
    const firstRun = createRun({
      runId: 'run-1',
      status: 'running',
      lastUpdatedAt: '2026-03-11T10:30:00.000Z',
    });
    const lastRun = createRun({
      runId: 'run-2',
      status: 'completed',
      lastUpdatedAt: '2026-03-11T11:00:00.000Z',
    });
    const runs: readonly RepairRun[] = [firstRun, lastRun];
    const timeline = createTimeline();

    const summary = buildIncidentHistorySummary('incident-1', runs, timeline);

    expect(summary.incidentId).toBe('incident-1');
    expect(summary.totalRuns).toBe(2);
    expect(summary.lastRunStatus).toBe('completed');
    expect(summary.lastRunFinishedAt).toBe('2026-03-11T11:00:00.000Z');
  });

  it('handles no runs', () => {
    const timeline = createTimeline();

    const summary = buildIncidentHistorySummary('incident-1', [], timeline);

    expect(summary.totalRuns).toBe(0);
    expect(summary.lastRunStatus).toBeNull();
    expect(summary.lastRunFinishedAt).toBeNull();
  });

  it('handles empty timeline', () => {
    const runs: readonly RepairRun[] = [createRun()];
    const timeline: IncidentTimeline = {
      incidentId: 'incident-1',
      correlationId: 'incident-1',
      startedAt: '2026-03-11T10:00:00.000Z',
      lastUpdatedAt: '2026-03-11T10:00:00.000Z',
      status: 'open',
      entries: [],
    };

    const summary = buildIncidentHistorySummary('incident-1', runs, timeline);

    expect(summary.timelineEventCount).toBe(0);
  });

  it('does not mutate inputs', () => {
    const runs: RepairRun[] = [createRun(), createRun({ runId: 'run-2' })];
    const timeline = createTimeline();
    const runsSnapshot = JSON.parse(JSON.stringify(runs));
    const timelineSnapshot = JSON.parse(JSON.stringify(timeline));

    buildIncidentHistorySummary('incident-1', runs, timeline);

    expect(runs).toEqual(runsSnapshot);
    expect(timeline).toEqual(timelineSnapshot);
  });
});

