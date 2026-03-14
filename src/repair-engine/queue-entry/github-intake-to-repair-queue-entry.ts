/**
 * GH-10: Pure mapping from GitHub intake event to queue entry contract.
 */

import type { GitHubRepairIntakeEvent } from '../../github/intake-bridge';
import type { RepairQueueEntry } from './repair-queue-entry';
import type { RepairQueueEntryStatus } from './repair-queue-entry-status';

function deriveStatus(trigger: string, riskFlag: boolean): RepairQueueEntryStatus {
  if (trigger === 'UNKNOWN') return 'UNKNOWN';
  if (riskFlag === true) return 'BLOCKED';
  return 'PENDING';
}

function buildEntryId(input: GitHubRepairIntakeEvent): string {
  return `github:${input.externalEventId}:${input.subjectId}:${input.trigger}`;
}

function getCreatedFromReason(input: GitHubRepairIntakeEvent): string {
  const reasons = input.reasons;
  if (reasons != null && reasons.length > 0) {
    for (const r of reasons) {
      if (typeof r === 'string' && r.trim() !== '') return r.trim();
    }
  }
  return input.summary?.trim() || 'No reason available';
}

export function mapGitHubIntakeToRepairQueueEntry(
  input: GitHubRepairIntakeEvent
): RepairQueueEntry {
  const status = deriveStatus(input.trigger, input.riskFlag);
  const entryId = buildEntryId(input);
  const createdFromReason = getCreatedFromReason(input);

  const meta = input.metadata ?? {};
  const metadata: Record<string, unknown> = {
    intakeSource: input.source,
    intakeTrigger: input.trigger,
    reviewComplexity: input.reviewComplexity ?? null,
    sizeBand: input.sizeBand ?? null,
    backboneCategory: meta.backboneCategory ?? null,
    inspectionAvailable: meta.inspectionAvailable ?? null,
    intelligenceAvailable: meta.intelligenceAvailable ?? null,
  };
  if (meta.totalChangedFiles != null) metadata.totalChangedFiles = meta.totalChangedFiles;
  if (meta.totalAdditions != null) metadata.totalAdditions = meta.totalAdditions;
  if (meta.totalDeletions != null) metadata.totalDeletions = meta.totalDeletions;
  if (meta.totalChanges != null) metadata.totalChanges = meta.totalChanges;

  return Object.freeze({
    entryId,
    source: 'GITHUB',
    status,

    externalEventId: input.externalEventId ?? '',
    subjectId: input.subjectId ?? '',
    trigger: input.trigger ?? '',
    summary: input.summary ?? '',

    createdFromReason,
    riskFlag: input.riskFlag ?? false,

    repositoryOwner: input.repositoryOwner,
    repositoryName: input.repositoryName,
    pullRequestNumber: input.pullRequestNumber,
    branchName: input.branchName,

    metadata: Object.freeze(metadata),
  });
}
