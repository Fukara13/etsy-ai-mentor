import { describe, it, expect } from 'vitest';

import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';
import type { RepairRun } from './repair-run';
import { deriveRepairRunLifecycleState } from './repair-run-lifecycle';

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

describe('deriveRepairRunLifecycleState', () => {
  it('derives started/active lifecycle for running run', () => {
    const run = createRun({ status: 'running' });

    const lifecycle = deriveRepairRunLifecycleState(run);

    expect(lifecycle.phase).toBe('active');
    expect(lifecycle.isStarted).toBe(true);
    expect(lifecycle.isActive).toBe(true);
    expect(lifecycle.isCompleted).toBe(false);
    expect(lifecycle.isEscalated).toBe(false);
    expect(lifecycle.isAborted).toBe(false);
  });

  it('derives completed lifecycle for completed run', () => {
    const run = createRun({ status: 'completed' });

    const lifecycle = deriveRepairRunLifecycleState(run);

    expect(lifecycle.phase).toBe('completed');
    expect(lifecycle.isCompleted).toBe(true);
    expect(lifecycle.isActive).toBe(false);
    expect(lifecycle.isEscalated).toBe(false);
    expect(lifecycle.isAborted).toBe(false);
  });

  it('derives escalated lifecycle for escalated run', () => {
    const run = createRun({ status: 'escalated' });

    const lifecycle = deriveRepairRunLifecycleState(run);

    expect(lifecycle.phase).toBe('escalated');
    expect(lifecycle.isEscalated).toBe(true);
    expect(lifecycle.isActive).toBe(false);
    expect(lifecycle.isCompleted).toBe(false);
    expect(lifecycle.isAborted).toBe(false);
  });

  it('derives aborted lifecycle for aborted run', () => {
    const run = createRun({ status: 'aborted' });

    const lifecycle = deriveRepairRunLifecycleState(run);

    expect(lifecycle.phase).toBe('aborted');
    expect(lifecycle.isAborted).toBe(true);
    expect(lifecycle.isActive).toBe(false);
    expect(lifecycle.isCompleted).toBe(false);
    expect(lifecycle.isEscalated).toBe(false);
  });

  it('handles minimal signal edge case deterministically', () => {
    const run = createRun({
      startedAt: '2026-03-11T10:00:00.000Z',
      status: 'running',
    });

    const first = deriveRepairRunLifecycleState(run);
    const second = deriveRepairRunLifecycleState(run);

    expect(first).toEqual(second);
  });

  it('does not mutate input RepairRun', () => {
    const run = createRun();
    const snapshot = JSON.parse(JSON.stringify(run));

    deriveRepairRunLifecycleState(run);

    expect(run).toEqual(snapshot);
  });
});

