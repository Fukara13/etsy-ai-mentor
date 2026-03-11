import type { RepairRun } from '../run/repair-run';
import type { RepairRunSummary } from './repair-run-summary';

/**
 * RE-13: Pure projection from RepairRun to RepairRunSummary.
 */
export function buildRepairRunSummary(run: RepairRun): RepairRunSummary {
  const { runId, incidentId, status, startedAt, lastUpdatedAt, timeline } = run;
  const entries = timeline.entries;

  const timelineEventCount = entries.length;
  const lastEventType =
    timelineEventCount > 0 ? String(entries[timelineEventCount - 1].entryType) : null;

  return {
    runId,
    incidentId,
    status,
    startedAt,
    lastUpdatedAt,
    timelineEventCount,
    lastEventType,
  };
}

