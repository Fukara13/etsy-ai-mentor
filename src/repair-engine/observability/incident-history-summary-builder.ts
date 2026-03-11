import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { RepairRun } from '../run/repair-run';
import type { IncidentHistorySummary } from './incident-history-summary';

export function buildIncidentHistorySummary(
  incidentId: string,
  runs: readonly RepairRun[],
  timeline: IncidentTimeline
): IncidentHistorySummary {
  const totalRuns = runs.length;
  const timelineEventCount = timeline.entries.length;

  if (totalRuns === 0) {
    return {
      incidentId,
      totalRuns: 0,
      lastRunStatus: null,
      lastRunFinishedAt: null,
      timelineEventCount,
    };
  }

  const lastRun = runs[totalRuns - 1];

  return {
    incidentId,
    totalRuns,
    lastRunStatus: lastRun.status,
    lastRunFinishedAt: lastRun.lastUpdatedAt,
    timelineEventCount,
  };
}

