import { describe, it, expect } from 'vitest';

import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import type { RepairRun } from './repair-run';
import {
  buildRepairRunEventLogEntry,
  buildRepairRunEventLog,
  type RepairRunEventLogContext,
} from './repair-run-event-log-builder';

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

function createRun(overrides: Partial<RepairRun> = {}): RepairRun {
  const entry = createEntry();
  const timeline: IncidentTimeline = {
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    startedAt: entry.timestamp,
    lastUpdatedAt: entry.timestamp,
    status: 'open',
    entries: [entry],
  };

  return {
    runId: 'run-1',
    incidentId: 'incident-1',
    correlationId: 'incident-1',
    startedAt: timeline.startedAt,
    lastUpdatedAt: timeline.lastUpdatedAt,
    status: 'running',
    timeline,
    ...overrides,
  };
}

describe('buildRepairRunEventLogEntry', () => {
  it('builds deterministic event log entry from repair run context', () => {
    const run = createRun();
    const context: RepairRunEventLogContext = {
      run,
      eventType: 'created',
      reasonCode: 'RUN_CREATED',
      phase: 'received',
      status: 'running',
      sequence: 0,
    };

    const entry = buildRepairRunEventLogEntry(context);

    expect(entry.entityType).toBe('repair_run');
    expect(entry.entityId).toBe('run-1');
    expect(entry.eventType).toBe('created');
    expect(entry.reasonCode).toBe('RUN_CREATED');
    expect(entry.phase).toBe('received');
    expect(entry.status).toBe('running');
    expect(entry.sequence).toBe(0);
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('produces the same event log entry for the same input context', () => {
    const run = createRun();
    const context: RepairRunEventLogContext = {
      run,
      eventType: 'created',
      reasonCode: 'RUN_CREATED',
      phase: 'received',
      status: 'running',
      sequence: 0,
    };

    const a = buildRepairRunEventLogEntry(context);
    const b = buildRepairRunEventLogEntry(context);

    expect(a).toEqual(b);
  });

  it('does not mutate the input run or context', () => {
    const run = createRun();
    const context: RepairRunEventLogContext = {
      run,
      eventType: 'created',
      reasonCode: 'RUN_CREATED',
      phase: 'received',
      status: 'running',
      sequence: 0,
      payload: { key: 'value' },
    };

    const runSnapshot = JSON.parse(JSON.stringify(run));
    const contextSnapshot = JSON.parse(JSON.stringify(context));

    buildRepairRunEventLogEntry(context);

    expect(run).toEqual(runSnapshot);
    expect(context).toEqual(contextSnapshot);
  });
});

describe('buildRepairRunEventLog', () => {
  it('preserves event ordering based on input contexts', () => {
    const run = createRun();
    const contexts: RepairRunEventLogContext[] = [
      {
        run,
        eventType: 'created',
        reasonCode: 'RUN_CREATED',
        phase: 'received',
        status: 'running',
        sequence: 0,
      },
      {
        run,
        eventType: 'evaluated',
        reasonCode: 'RUN_EVALUATED',
        phase: 'evaluated',
        status: 'running',
        sequence: 1,
      },
    ];

    const log = buildRepairRunEventLog(contexts);

    expect(log.entries).toHaveLength(2);
    expect(log.entries[0].eventType).toBe('created');
    expect(log.entries[1].eventType).toBe('evaluated');
  });

  it('returns immutable log and entries array', () => {
    const run = createRun();
    const contexts: RepairRunEventLogContext[] = [
      {
        run,
        eventType: 'created',
        reasonCode: 'RUN_CREATED',
        phase: 'received',
        status: 'running',
        sequence: 0,
      },
    ];

    const log = buildRepairRunEventLog(contexts);

    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(log.entries)).toBe(true);
  });

  it('throws for invalid sequence and propagates underlying validation', () => {
    const run = createRun();
    const contexts: RepairRunEventLogContext[] = [
      {
        run,
        eventType: 'created',
        reasonCode: 'RUN_CREATED',
        phase: 'received',
        status: 'running',
        sequence: -1,
      },
    ];

    expect(() => buildRepairRunEventLog(contexts)).toThrow(
      'EventLogEntry requires non-negative sequence.'
    );
  });
});

