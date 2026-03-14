import { describe, expect, it } from 'vitest';
import { mapGitHubIntakeToRepairQueueEntry } from './index';

function intakeEvent(overrides: Partial<Parameters<typeof mapGitHubIntakeToRepairQueueEntry>[0]> = {}) {
  return {
    source: 'GITHUB_BACKBONE' as const,
    trigger: 'GITHUB_PR_REVIEW_REQUIRED' as const,
    externalEventId: 'evt-1',
    eventKind: 'pull_request',
    subjectId: 'pr-42',
    summary: 'PR update',
    riskFlag: false,
    reasons: ['Docs change'],
    metadata: {},
    ...overrides,
  };
}

describe('mapGitHubIntakeToRepairQueueEntry', () => {
  it('maps a non-risk intake event into PENDING', () => {
    const input = intakeEvent({ riskFlag: false, trigger: 'GITHUB_PR_REVIEW_REQUIRED' });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.status).toBe('PENDING');
  });

  it('maps a risky intake event into BLOCKED', () => {
    const input = intakeEvent({ riskFlag: true });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.status).toBe('BLOCKED');
  });

  it('maps UNKNOWN trigger into UNKNOWN status', () => {
    const input = intakeEvent({ trigger: 'UNKNOWN', riskFlag: false });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.status).toBe('UNKNOWN');
  });

  it('builds deterministic entryId correctly', () => {
    const input = intakeEvent({
      externalEventId: 'del-xyz',
      subjectId: 'pr-10',
      trigger: 'GITHUB_WORKFLOW_FAILURE',
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.entryId).toBe('github:del-xyz:pr-10:GITHUB_WORKFLOW_FAILURE');
  });

  it('preserves externalEventId / subjectId / trigger / summary exactly', () => {
    const input = intakeEvent({
      externalEventId: 'ev-99',
      subjectId: 'sha-abc',
      trigger: 'GITHUB_PR_RISK_SIGNAL',
      summary: 'Risky PR',
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.externalEventId).toBe('ev-99');
    expect(result.subjectId).toBe('sha-abc');
    expect(result.trigger).toBe('GITHUB_PR_RISK_SIGNAL');
    expect(result.summary).toBe('Risky PR');
  });

  it('maps repository and PR context when present', () => {
    const input = intakeEvent({
      repositoryOwner: 'owner',
      repositoryName: 'repo',
      pullRequestNumber: 5,
      branchName: 'feature-x',
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.repositoryOwner).toBe('owner');
    expect(result.repositoryName).toBe('repo');
    expect(result.pullRequestNumber).toBe(5);
    expect(result.branchName).toBe('feature-x');
  });

  it('uses first reason as createdFromReason', () => {
    const input = intakeEvent({ reasons: ['First reason', 'Second reason'] });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.createdFromReason).toBe('First reason');
  });

  it('falls back to summary when reasons missing or empty', () => {
    const input = intakeEvent({ reasons: [], summary: 'Fallback summary' });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.createdFromReason).toBe('Fallback summary');
  });

  it('forwards safe metadata fields only', () => {
    const input = intakeEvent({
      reviewComplexity: 'MEDIUM',
      sizeBand: 'SMALL',
      metadata: {
        backboneCategory: 'PULL_REQUEST_UPDATE',
        inspectionAvailable: true,
        intelligenceAvailable: true,
      },
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.metadata.reviewComplexity).toBe('MEDIUM');
    expect(result.metadata.sizeBand).toBe('SMALL');
    expect(result.metadata.backboneCategory).toBe('PULL_REQUEST_UPDATE');
    expect(result.metadata.inspectionAvailable).toBe(true);
    expect(result.metadata.intelligenceAvailable).toBe(true);
  });

  it('does not leak raw payload-like fields into output', () => {
    const input = intakeEvent({
      metadata: {
        rawPayload: { x: 1 },
        queueJob: 'job-1',
        secret: 's',
      } as Record<string, unknown>,
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.metadata.rawPayload).toBeUndefined();
    expect(result.metadata.queueJob).toBeUndefined();
    expect(result.metadata.secret).toBeUndefined();
  });

  it('does not mutate input', () => {
    const input = intakeEvent();
    const before = structuredClone(input);
    mapGitHubIntakeToRepairQueueEntry(input);
    expect(input).toEqual(before);
  });

  it('produces deterministic output for same input', () => {
    const input = intakeEvent();
    const a = mapGitHubIntakeToRepairQueueEntry(input);
    const b = mapGitHubIntakeToRepairQueueEntry(input);
    expect(a).toEqual(b);
  });

  it('preserves optional totals when present in metadata', () => {
    const input = intakeEvent({
      metadata: {
        totalChangedFiles: 3,
        totalAdditions: 10,
        totalDeletions: 2,
        totalChanges: 12,
      },
    });
    const result = mapGitHubIntakeToRepairQueueEntry(input);
    expect(result.metadata.totalChangedFiles).toBe(3);
    expect(result.metadata.totalAdditions).toBe(10);
    expect(result.metadata.totalDeletions).toBe(2);
    expect(result.metadata.totalChanges).toBe(12);
  });
});
