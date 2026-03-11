import type { RepairRunStatus } from '../run/repair-run-status';

export interface IncidentHistorySummary {
  readonly incidentId: string;
  readonly totalRuns: number;
  readonly lastRunStatus: RepairRunStatus | null;
  readonly lastRunFinishedAt: string | null;
  readonly timelineEventCount: number;
}

