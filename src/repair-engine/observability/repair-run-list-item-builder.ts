import type { RepairRun } from '../run/repair-run';
import type { RepairRunListItem } from './repair-run-list-item';

export function buildRepairRunListItem(run: RepairRun): RepairRunListItem {
  const { runId, incidentId, status, startedAt, lastUpdatedAt, timeline } = run;
  const entries = timeline.entries;

  const timelineEventCount = entries.length;
  const lastEventType =
    timelineEventCount > 0 ? entries[timelineEventCount - 1].entryType : null;

  return {
    runId,
    incidentId,
    status,
    startedAt,
    finishedAt: lastUpdatedAt,
    timelineEventCount,
    lastEventType,
  };
}

