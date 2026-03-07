/**
 * Gate-S27: GitHub Projection — Entry point for PR comment projection.
 */

export { mapGitHubProjection } from './github-projection-mapper';
export type {
  GitHubProjection,
  GitHubProjectionSurface,
  GitHubProjectionStatus,
  GitHubProjectionConclusion,
  GitHubProjectionMetadata,
} from './github-projection.types';
