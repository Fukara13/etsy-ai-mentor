/**
 * GH-9: Repair Engine-facing intake event contract.
 */

import type { RepairIntakeSource } from './repair-intake-source';
import type { RepairIntakeTrigger } from './repair-intake-trigger';

export interface GitHubRepairIntakeEvent {
  readonly source: RepairIntakeSource;
  readonly trigger: RepairIntakeTrigger;
  readonly externalEventId: string;
  readonly eventKind: string;
  readonly subjectId: string;
  readonly summary: string;

  readonly repositoryOwner?: string;
  readonly repositoryName?: string;
  readonly pullRequestNumber?: number;
  readonly branchName?: string;

  readonly riskFlag: boolean;
  readonly reviewComplexity?: string;
  readonly sizeBand?: string;

  readonly reasons: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
}
