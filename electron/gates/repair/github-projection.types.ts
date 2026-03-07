/**
 * Gate-S27: GitHub Projection — Canonical types for PR comment projection.
 */

export type GitHubProjectionSurface = 'pr_comment';

export type GitHubProjectionStatus =
  | 'resolved'
  | 'requires_human'
  | 'halted'
  | 'blocked';

export type GitHubProjectionConclusion =
  | 'success'
  | 'neutral'
  | 'action_required'
  | 'failure';

export type GitHubProjectionMetadata = {
  readonly sessionId?: string;
  readonly totalSteps?: number;
};

export interface GitHubProjection {
  readonly surface: GitHubProjectionSurface;
  readonly status: GitHubProjectionStatus;
  readonly title: string;
  readonly body: string;
  readonly summary: string;
  readonly recommendedConclusion: GitHubProjectionConclusion;
  readonly requiresHuman: boolean;
  readonly safeToRetry: boolean;
  readonly safeToClose: boolean;
  readonly finalState: string;
  readonly reasonCode: string;
  readonly metadata?: GitHubProjectionMetadata;
}
