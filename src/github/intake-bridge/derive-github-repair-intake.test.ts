import { describe, expect, it } from 'vitest';
import {
  deriveGitHubRepairIntake,
  type GitHubRepairIntakeInput,
} from './derive-github-repair-intake';

function backboneEvent(overrides: Partial<GitHubRepairIntakeInput['backboneEvent']> = {}) {
  return {
    category: 'UNKNOWN' as const,
    deliveryId: 'del-123',
    eventKind: 'push',
    subjectId: 'sub-1',
    summary: 'Push event',
    metadata: {},
    ...overrides,
  };
}

describe('deriveGitHubRepairIntake', () => {
  it('maps workflow failure event into GITHUB_WORKFLOW_FAILURE', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ category: 'WORKFLOW_RUN_FAILURE' }),
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.trigger).toBe('GITHUB_WORKFLOW_FAILURE');
  });

  it('maps risky intelligence into GITHUB_PR_RISK_SIGNAL', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ category: 'PULL_REQUEST_UPDATE' }),
      intelligenceResult: { risky: true } as GitHubRepairIntakeInput['intelligenceResult'],
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.trigger).toBe('GITHUB_PR_RISK_SIGNAL');
    expect(result.riskFlag).toBe(true);
  });

  it('maps non-risk intelligence into GITHUB_PR_REVIEW_REQUIRED', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ category: 'PULL_REQUEST_UPDATE' }),
      intelligenceResult: { risky: false, reasons: ['docs change'] } as GitHubRepairIntakeInput['intelligenceResult'],
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.trigger).toBe('GITHUB_PR_REVIEW_REQUIRED');
    expect(result.riskFlag).toBe(false);
  });

  it('falls back to UNKNOWN when no intelligence and no known workflow failure', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ category: 'PUSH' }),
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.trigger).toBe('UNKNOWN');
  });

  it('preserves externalEventId / subjectId / summary exactly', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({
        deliveryId: 'evt-xyz',
        subjectId: 'pr-42',
        summary: 'PR opened: Fix bug',
      }),
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.externalEventId).toBe('evt-xyz');
    expect(result.subjectId).toBe('pr-42');
    expect(result.summary).toBe('PR opened: Fix bug');
  });

  it('maps repository and PR context when inspection result exists', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent(),
      inspectionResult: {
        repositoryFullName: 'owner/repo',
        prNumber: 10,
        headBranch: 'feature-branch',
        totalChangedFiles: 5,
        totalAdditions: 20,
        totalDeletions: 5,
        totalChanges: 25,
        title: '',
        state: '',
        isDraft: false,
        baseBranch: 'main',
        changedFiles: [],
        isMergeabilityKnown: false,
        isMergeable: false,
        hasMergeConflictHint: false,
      },
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.repositoryOwner).toBe('owner');
    expect(result.repositoryName).toBe('repo');
    expect(result.pullRequestNumber).toBe(10);
    expect(result.branchName).toBe('feature-branch');
  });

  it('preserves totals in metadata when inspection exists', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent(),
      inspectionResult: {
        repositoryFullName: 'a/b',
        prNumber: 1,
        headBranch: 'x',
        baseBranch: 'main',
        totalChangedFiles: 3,
        totalAdditions: 15,
        totalDeletions: 2,
        totalChanges: 17,
        title: '',
        state: '',
        isDraft: false,
        changedFiles: [],
        isMergeabilityKnown: false,
        isMergeable: false,
        hasMergeConflictHint: false,
      },
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.metadata.totalChangedFiles).toBe(3);
    expect(result.metadata.totalAdditions).toBe(15);
    expect(result.metadata.totalDeletions).toBe(2);
    expect(result.metadata.totalChanges).toBe(17);
  });

  it('works without inspectionResult', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent(),
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.repositoryOwner).toBeUndefined();
    expect(result.pullRequestNumber).toBeUndefined();
    expect(result.metadata.inspectionAvailable).toBe(false);
    expect(result.metadata.totalChangedFiles).toBeUndefined();
  });

  it('works without intelligenceResult', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ summary: 'Push to main' }),
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.riskFlag).toBe(false);
    expect(result.reviewComplexity).toBeUndefined();
    expect(result.reasons).toContain('Push to main');
    expect(result.metadata.intelligenceAvailable).toBe(false);
  });

  it('uses summary as fallback reason when intelligence reasons absent', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent({ summary: 'Fallback summary' }),
      intelligenceResult: { risky: false, reasons: [] } as GitHubRepairIntakeInput['intelligenceResult'],
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.reasons).toContain('Fallback summary');
  });

  it('does not mutate input', () => {
    const bb = backboneEvent();
    const input: GitHubRepairIntakeInput = { backboneEvent: bb };
    const before = structuredClone(input);
    deriveGitHubRepairIntake(input);
    expect(input).toEqual(before);
  });

  it('produces deterministic output for same input', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: backboneEvent(),
      intelligenceResult: { risky: true, reasons: ['risk'] } as GitHubRepairIntakeInput['intelligenceResult'],
    };
    const a = deriveGitHubRepairIntake(input);
    const b = deriveGitHubRepairIntake(input);
    expect(a).toEqual(b);
  });

  it('does not leak raw payload or execution fields into output', () => {
    const input: GitHubRepairIntakeInput = {
      backboneEvent: {
        ...backboneEvent(),
        metadata: { rawPayload: { sensitive: true }, queueJob: 'x' } as Record<string, unknown>,
      },
    };
    const result = deriveGitHubRepairIntake(input);
    expect(result.metadata.rawPayload).toBeUndefined();
    expect(result.metadata.queueJob).toBeUndefined();
    expect(result.metadata.sensitive).toBeUndefined();
    expect('queueJob' in result).toBe(false);
  });
});
