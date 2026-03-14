/**
 * GH-10: Queue-facing RepairQueueEntry contract.
 */

import type { RepairQueueEntrySource } from './repair-queue-entry-source';
import type { RepairQueueEntryStatus } from './repair-queue-entry-status';

export interface RepairQueueEntry {
  readonly entryId: string;
  readonly source: RepairQueueEntrySource;
  readonly status: RepairQueueEntryStatus;

  readonly externalEventId: string;
  readonly subjectId: string;
  readonly trigger: string;
  readonly summary: string;

  readonly createdFromReason: string;
  readonly riskFlag: boolean;

  readonly repositoryOwner?: string;
  readonly repositoryName?: string;
  readonly pullRequestNumber?: number;
  readonly branchName?: string;

  readonly metadata: Readonly<Record<string, unknown>>;
}
