/**
 * GH-7: PR inspection result.
 */

import type { PrFileChange } from './pr-file-change';

export interface PullRequestInspectionResult {
  readonly prNumber: number;
  readonly title: string;
  readonly state: string;
  readonly isDraft: boolean;
  readonly repositoryFullName: string;
  readonly headBranch: string;
  readonly baseBranch: string;
  readonly changedFiles: readonly PrFileChange[];
  readonly totalChangedFiles: number;
  readonly totalAdditions: number;
  readonly totalDeletions: number;
  readonly totalChanges: number;
  readonly isMergeabilityKnown: boolean;
  readonly isMergeable: boolean;
  readonly hasMergeConflictHint: boolean;
}
