/**
 * GH-6: Normalized GitHub event categories for backbone intake.
 */

export const GITHUB_EVENT_CATEGORIES = [
  'WORKFLOW_RUN_FAILURE',
  'PULL_REQUEST_UPDATE',
  'PUSH',
  'UNKNOWN',
] as const;

export type GitHubEventCategory = (typeof GITHUB_EVENT_CATEGORIES)[number];
