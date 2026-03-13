import { describe, expect, it } from 'vitest';
import {
  inspectPullRequest,
  type PullRequestInspectionInput,
} from './inspect-pull-request';

function prInput(overrides: Partial<PullRequestInspectionInput> = {}): PullRequestInspectionInput {
  return {
    pullRequest: {
      number: 1,
      title: 'Fix bug',
      state: 'open',
      head: { ref: 'feature-branch' },
      base: { ref: 'main' },
    },
    repository: { fullName: 'owner/repo' },
    files: [],
    ...overrides,
  };
}

describe('inspectPullRequest', () => {
  it('returns normalized inspection result for a basic PR', () => {
    const input = prInput({
      pullRequest: { number: 42, title: 'Add feature', state: 'open', head: { ref: 'feat/x' }, base: { ref: 'main' } },
      repository: { fullName: 'org/project' },
    });

    const result = inspectPullRequest(input);

    expect(result.prNumber).toBe(42);
    expect(result.title).toBe('Add feature');
    expect(result.state).toBe('open');
    expect(result.repositoryFullName).toBe('org/project');
    expect(result.headBranch).toBe('feat/x');
    expect(result.baseBranch).toBe('main');
  });

  it('computes totals from changed files correctly', () => {
    const input = prInput({
      files: [
        { filename: 'a.ts', additions: 10, deletions: 2 },
        { filename: 'b.ts', additions: 5, deletions: 5 },
      ],
    });

    const result = inspectPullRequest(input);

    expect(result.totalChangedFiles).toBe(2);
    expect(result.totalAdditions).toBe(15);
    expect(result.totalDeletions).toBe(7);
  });

  it('defaults files to empty array', () => {
    const input = prInput({ files: undefined });

    const result = inspectPullRequest(input);

    expect(result.changedFiles).toEqual([]);
    expect(result.totalChangedFiles).toBe(0);
  });

  it('defaults numeric file counters to 0 when missing', () => {
    const input = prInput({
      files: [{ filename: 'x.ts' }],
    });

    const result = inspectPullRequest(input);

    expect(result.changedFiles[0].additions).toBe(0);
    expect(result.changedFiles[0].deletions).toBe(0);
    expect(result.changedFiles[0].changes).toBe(0);
  });

  it('normalizes unknown file status to unknown', () => {
    const input = prInput({
      files: [{ filename: 'a.ts', status: 'custom-status' }],
    });

    const result = inspectPullRequest(input);

    expect(result.changedFiles[0].status).toBe('unknown');
  });

  it('preserves previous_filename for renamed files', () => {
    const input = prInput({
      files: [
        { filename: 'new-name.ts', previous_filename: 'old-name.ts', status: 'renamed' },
      ],
    });

    const result = inspectPullRequest(input);

    expect(result.changedFiles[0].previousPath).toBe('old-name.ts');
    expect(result.changedFiles[0].path).toBe('new-name.ts');
    expect(result.changedFiles[0].status).toBe('renamed');
  });

  it('handles draft PR correctly', () => {
    const input = prInput({ pullRequest: { ...prInput().pullRequest, draft: true } });

    const result = inspectPullRequest(input);

    expect(result.isDraft).toBe(true);
  });

  it('handles mergeable true correctly', () => {
    const input = prInput({
      pullRequest: { ...prInput().pullRequest, mergeable: true },
    });

    const result = inspectPullRequest(input);

    expect(result.isMergeabilityKnown).toBe(true);
    expect(result.isMergeable).toBe(true);
    expect(result.hasMergeConflictHint).toBe(false);
  });

  it('handles mergeable false correctly', () => {
    const input = prInput({
      pullRequest: { ...prInput().pullRequest, mergeable: false },
    });

    const result = inspectPullRequest(input);

    expect(result.isMergeabilityKnown).toBe(true);
    expect(result.isMergeable).toBe(false);
    expect(result.hasMergeConflictHint).toBe(true);
  });

  it('handles mergeable null conservatively', () => {
    const input = prInput({
      pullRequest: { ...prInput().pullRequest, mergeable: null },
    });

    const result = inspectPullRequest(input);

    expect(result.isMergeabilityKnown).toBe(false);
    expect(result.isMergeable).toBe(false);
    expect(result.hasMergeConflictHint).toBe(false);
  });

  it('does not mutate input', () => {
    const input = prInput({ files: [{ filename: 'a.ts' }] });
    const before = structuredClone(input);

    inspectPullRequest(input);

    expect(input).toEqual(before);
  });

  it('is deterministic for same input', () => {
    const input = prInput({
      files: [{ filename: 'x.ts', additions: 1, deletions: 2 }],
    });

    const a = inspectPullRequest(input);
    const b = inspectPullRequest(input);

    expect(a).toEqual(b);
  });

  it('works with empty file list', () => {
    const input = prInput({ files: [] });

    const result = inspectPullRequest(input);

    expect(result.totalChangedFiles).toBe(0);
    expect(result.totalAdditions).toBe(0);
    expect(result.totalDeletions).toBe(0);
  });

  it('keeps branch and repository context correctly', () => {
    const input = prInput({
      pullRequest: {
        number: 10,
        title: 'Branch test',
        state: 'open',
        head: { ref: 'dev/feature' },
        base: { ref: 'release/1.0' },
      },
      repository: { fullName: 'acme/backend' },
    });

    const result = inspectPullRequest(input);

    expect(result.headBranch).toBe('dev/feature');
    expect(result.baseBranch).toBe('release/1.0');
    expect(result.repositoryFullName).toBe('acme/backend');
  });
});
