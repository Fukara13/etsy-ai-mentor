/**
 * Gate-S27: GitHub projection mapper — Pure mapping from external projection to GitHub PR comment format.
 * No side effects. No decision logic. Input must be RepairExternalProjection.
 */

import type { RepairExternalProjection } from './external-boundary.types';
import type { ProjectionStatus } from './external-boundary.types';
import type {
  GitHubProjection,
  GitHubProjectionStatus,
  GitHubProjectionConclusion,
} from './github-projection.types';

const UNSUPPORTED_STATUS_PREFIX = 'Unsupported projectionStatus for GitHub projection: ';

function statusToGitHubStatus(s: ProjectionStatus): GitHubProjectionStatus {
  switch (s) {
    case 'resolved':
    case 'requires_human':
    case 'halted':
    case 'blocked':
      return s;
    default: {
      throw new Error(`${UNSUPPORTED_STATUS_PREFIX}${String(s)}`);
    }
  }
}

function statusToConclusion(s: GitHubProjectionStatus): GitHubProjectionConclusion {
  switch (s) {
    case 'resolved':
      return 'success';
    case 'requires_human':
      return 'action_required';
    case 'halted':
      return 'neutral';
    case 'blocked':
      return 'failure';
    default: {
      const _: never = s;
      return 'failure';
    }
  }
}

function statusToTitle(s: GitHubProjectionStatus): string {
  switch (s) {
    case 'resolved':
      return 'Repair resolved — safe to close';
    case 'requires_human':
      return 'Manual review required';
    case 'halted':
      return 'Repair halted';
    case 'blocked':
      return 'Repair blocked by policy';
    default: {
      const _: never = s;
      return 'Repair status unknown';
    }
  }
}

function statusToSummaryFallback(s: GitHubProjectionStatus): string {
  switch (s) {
    case 'resolved':
      return 'Repair completed successfully.';
    case 'requires_human':
      return 'Manual intervention is required.';
    case 'halted':
      return 'Repair flow halted without resolution.';
    case 'blocked':
      return 'Repair flow was blocked by policy.';
    default: {
      const _: never = s;
      return 'Repair status unknown.';
    }
  }
}

function trim(s: string): string {
  return s.trim();
}

function resolveSummary(input: RepairExternalProjection, status: GitHubProjectionStatus): string {
  const summary = trim(input.summary);
  if (summary.length > 0) return summary;
  const msg = trim(input.projectionMessage);
  if (msg.length > 0) return msg;
  return statusToSummaryFallback(status);
}

function yesNo(b: boolean): string {
  return b ? 'yes' : 'no';
}

function buildBody(
  title: string,
  projectionMessage: string,
  summary: string,
  recommendedAction: string,
  finalState: string,
  reasonCode: string,
  requiresHuman: boolean,
  safeToRetry: boolean,
  safeToClose: boolean,
  metadata?: { sessionId?: string; totalSteps?: number }
): string {
  const msg = projectionMessage.trim().length > 0 ? projectionMessage.trim() : summary;
  const lines: string[] = [
    title,
    '',
    `Message: ${msg}`,
    `Summary: ${summary}`,
    `Recommended action: ${recommendedAction}`,
    `Final state: ${finalState}`,
    `Reason code: ${reasonCode}`,
    `Requires human: ${yesNo(requiresHuman)}`,
    `Safe to retry: ${yesNo(safeToRetry)}`,
    `Safe to close: ${yesNo(safeToClose)}`,
  ];

  if (metadata?.sessionId != null && metadata.sessionId !== '') {
    lines.push(`Session ID: ${metadata.sessionId}`);
  }
  if (metadata?.totalSteps != null) {
    lines.push(`Total steps: ${metadata.totalSteps}`);
  }

  lines.push('');
  lines.push('Human authority remains required where applicable.');

  return lines.join('\n');
}

export function mapGitHubProjection(input: RepairExternalProjection): GitHubProjection {
  const status = statusToGitHubStatus(input.projectionStatus);
  const title = statusToTitle(status);
  const summary = resolveSummary(input, status);
  const body = buildBody(
    title,
    input.projectionMessage,
    summary,
    input.recommendedAction,
    input.finalState,
    input.reasonCode,
    input.requiresHuman,
    input.safeToRetry,
    input.safeToClose,
    input.metadata
  );

  return {
    surface: 'pr_comment',
    status,
    title,
    body,
    summary,
    recommendedConclusion: statusToConclusion(status),
    requiresHuman: input.requiresHuman,
    safeToRetry: input.safeToRetry,
    safeToClose: input.safeToClose,
    finalState: input.finalState,
    reasonCode: input.reasonCode,
    metadata: input.metadata,
  };
}
