/**
 * GH-9: Pure bridge from GitHub Backbone to Repair Engine intake.
 * No I/O, no mutation, deterministic.
 */

import type { GitHubRepairIntakeInput } from './github-repair-intake-input';
import type { GitHubRepairIntakeEvent } from './github-repair-intake-event';
import type { RepairIntakeTrigger } from './repair-intake-trigger';

function deriveTrigger(
  category: string,
  risky?: boolean,
  hasIntelligence?: boolean
): RepairIntakeTrigger {
  if (category === 'WORKFLOW_RUN_FAILURE') return 'GITHUB_WORKFLOW_FAILURE';
  if (risky === true) return 'GITHUB_PR_RISK_SIGNAL';
  if (hasIntelligence === true) return 'GITHUB_PR_REVIEW_REQUIRED';
  return 'UNKNOWN';
}

function parseOwnerRepo(fullName: string): { owner: string; name: string } | null {
  if (typeof fullName !== 'string' || fullName.trim() === '') return null;
  const parts = fullName.trim().split('/').filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], name: parts[1] };
  return null;
}

export function deriveGitHubRepairIntake(
  input: GitHubRepairIntakeInput
): GitHubRepairIntakeEvent {
  const bb = input.backboneEvent;
  const insp = input.inspectionResult;
  const intel = input.intelligenceResult;

  const trigger = deriveTrigger(
    bb.category,
    intel?.risky,
    intel != null
  );

  const reasons =
    intel?.reasons != null && intel.reasons.length > 0
      ? [...intel.reasons]
      : [bb.summary || 'No reason available'];

  const metadata: Record<string, unknown> = {
    backboneCategory: bb.category,
    inspectionAvailable: insp != null,
    intelligenceAvailable: intel != null,
  };
  if (insp != null) {
    metadata.totalChangedFiles = insp.totalChangedFiles;
    metadata.totalAdditions = insp.totalAdditions;
    metadata.totalDeletions = insp.totalDeletions;
    metadata.totalChanges = insp.totalChanges;
  }

  const repoInfo = insp?.repositoryFullName
    ? parseOwnerRepo(insp.repositoryFullName)
    : bb.repository?.fullName
      ? parseOwnerRepo(bb.repository.fullName)
      : null;

  return Object.freeze({
    source: 'GITHUB_BACKBONE',
    trigger,
    externalEventId: bb.deliveryId ?? '',
    eventKind: bb.eventKind ?? '',
    subjectId: bb.subjectId ?? '',
    summary: bb.summary ?? '',

    repositoryOwner: repoInfo?.owner,
    repositoryName: repoInfo?.name,
    pullRequestNumber: insp?.prNumber,
    branchName: insp?.headBranch,

    riskFlag: intel?.risky ?? false,
    reviewComplexity: intel?.reviewComplexity,
    sizeBand: intel?.sizeBand,

    reasons: Object.freeze(reasons),
    metadata: Object.freeze(metadata),
  });
}
