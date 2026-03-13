/**
 * GH-7: Pure PR inspection. No I/O, no mutation.
 */

import type { PrFileChange } from './pr-file-change';
import type { PrFileChangeStatus } from './pr-file-change-status';
import type { PullRequestInspectionInput } from './pull-request-inspection-input';
import type { PullRequestInspectionResult } from './pull-request-inspection-result';

const KNOWN_STATUSES: readonly string[] = [
  'added',
  'modified',
  'removed',
  'renamed',
  'copied',
  'changed',
];

function normalizeFileStatus(status?: string): PrFileChangeStatus {
  if (status == null || typeof status !== 'string') return 'unknown';
  const s = status.toLowerCase().trim();
  if (KNOWN_STATUSES.includes(s)) return s as PrFileChangeStatus;
  return 'unknown';
}

function safeNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.floor(v));
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function mapMergeable(
  mergeable: boolean | null | undefined
): Pick<
  PullRequestInspectionResult,
  'isMergeabilityKnown' | 'isMergeable' | 'hasMergeConflictHint'
> {
  if (mergeable === true) {
    return { isMergeabilityKnown: true, isMergeable: true, hasMergeConflictHint: false };
  }
  if (mergeable === false) {
    return { isMergeabilityKnown: true, isMergeable: false, hasMergeConflictHint: true };
  }
  return { isMergeabilityKnown: false, isMergeable: false, hasMergeConflictHint: false };
}

export function inspectPullRequest(
  input: PullRequestInspectionInput
): PullRequestInspectionResult {
  const pr = input.pullRequest;
  const repo = input.repository;
  const rawFiles = input.files ?? [];
  const mergeProps = mapMergeable(pr.mergeable);

  const changedFiles: PrFileChange[] = rawFiles.map((f) => {
    const status = normalizeFileStatus(f.status);
    const additions = safeNum(f.additions);
    const deletions = safeNum(f.deletions);
    const changes = safeNum(f.changes);
    return Object.freeze({
      path: typeof f.filename === 'string' ? f.filename : '',
      previousPath:
        f.previous_filename != null && typeof f.previous_filename === 'string'
          ? f.previous_filename
          : undefined,
      status,
      additions,
      deletions,
      changes,
    });
  });

  let totalAdditions = 0;
  let totalDeletions = 0;
  let totalChanges = 0;
  for (const cf of changedFiles) {
    totalAdditions += cf.additions;
    totalDeletions += cf.deletions;
    totalChanges += cf.changes;
  }

  return Object.freeze({
    prNumber: typeof pr.number === 'number' ? pr.number : 0,
    title: typeof pr.title === 'string' ? pr.title : '',
    state: typeof pr.state === 'string' ? pr.state : 'unknown',
    isDraft: pr.draft === true,
    repositoryFullName: typeof repo?.fullName === 'string' ? repo.fullName : '',
    headBranch:
      typeof pr.head?.ref === 'string' ? pr.head.ref : '',
    baseBranch:
      typeof pr.base?.ref === 'string' ? pr.base.ref : '',
    changedFiles: Object.freeze([...changedFiles]),
    totalChangedFiles: changedFiles.length,
    totalAdditions,
    totalDeletions,
    totalChanges,
    ...mergeProps,
  });
}
