import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { RepairRunStatus } from './repair-run-status';

export interface RepairRun {
  readonly runId: string;
  readonly incidentId: string;
  readonly correlationId: string;

  readonly startedAt: string;
  readonly lastUpdatedAt: string;

  readonly status: RepairRunStatus;

  readonly timeline: IncidentTimeline;
}

