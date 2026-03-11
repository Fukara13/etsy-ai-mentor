import type { RepairRunStatus } from '../run/repair-run-status';

/**
 * RE-13: Immutable observability read model for a repair run.
 */
export interface RepairRunSummary {
  readonly runId: string;
  readonly incidentId: string;
  readonly status: RepairRunStatus;
  readonly startedAt: string;
  readonly lastUpdatedAt: string;
  readonly timelineEventCount: number;
  readonly lastEventType: string | null;
}

