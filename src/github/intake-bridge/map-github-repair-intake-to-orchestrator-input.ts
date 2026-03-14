/**
 * RE-13: Pure mapping from GitHub repair intake event to orchestrator input.
 * Deterministic, no I/O.
 */

import type { RepairEngineOrchestratorInput } from '../../repair-engine/orchestrator';
import type { RepairEngineEvent } from '../../repair-engine/contracts/repair-engine-event';
import type { RepairEngineEventType } from '../../repair-engine/contracts/repair-engine-event-type';
import type { RepairEngineEventSource } from '../../repair-engine/contracts/repair-engine-event';
import type { GitHubRepairIntakeEvent } from './github-repair-intake-event';

function triggerToEventType(trigger: string): RepairEngineEventType {
  if (trigger === 'GITHUB_WORKFLOW_FAILURE') return 'CI_FAILURE';
  if (trigger === 'GITHUB_PR_RISK_SIGNAL' || trigger === 'GITHUB_PR_REVIEW_REQUIRED') {
    return 'PR_UPDATED';
  }
  return 'CI_FAILURE';
}

function triggerToSource(trigger: string): RepairEngineEventSource {
  if (trigger === 'GITHUB_WORKFLOW_FAILURE') return 'ci';
  if (trigger === 'GITHUB_PR_RISK_SIGNAL' || trigger === 'GITHUB_PR_REVIEW_REQUIRED') {
    return 'pull_request';
  }
  return 'ci';
}

function toMetadata(e: GitHubRepairIntakeEvent): RepairEngineEvent['metadata'] {
  const base: Record<string, string | number | boolean | null> = {
    externalEventId: e.externalEventId,
    trigger: e.trigger,
    riskFlag: e.riskFlag,
  };
  if (e.repositoryOwner) base.repositoryOwner = e.repositoryOwner;
  if (e.repositoryName) base.repositoryName = e.repositoryName;
  if (e.pullRequestNumber != null) base.pullRequestNumber = e.pullRequestNumber;
  if (e.branchName) base.branchName = e.branchName;
  if (e.reviewComplexity) base.reviewComplexity = e.reviewComplexity;
  if (e.sizeBand) base.sizeBand = e.sizeBand;
  return Object.freeze(base);
}

/**
 * Maps GitHub repair intake event to RepairEngineOrchestratorInput.
 */
export function mapGitHubRepairIntakeToOrchestratorInput(
  e: GitHubRepairIntakeEvent
): RepairEngineOrchestratorInput {
  const type = triggerToEventType(e.trigger);
  const source = triggerToSource(e.trigger);
  const event: RepairEngineEvent = Object.freeze({
    type,
    source,
    subjectId: e.subjectId?.trim() || e.externalEventId || 'unknown',
    summary: e.summary?.trim() || 'No summary',
    attemptCount: 0,
    metadata: toMetadata(e),
  });
  return Object.freeze({ event });
}
