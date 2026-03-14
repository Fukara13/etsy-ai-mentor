/**
 * GH-6: Normalized internal GitHub backbone event model.
 */

import type { GitHubEventCategory } from './github-event-category';

export interface GitHubBackboneEvent {
  readonly category: GitHubEventCategory;
  readonly deliveryId: string;
  readonly eventKind: string;
  readonly action?: string;
  readonly repository?: {
    readonly fullName: string;
    readonly defaultBranch?: string;
  };
  readonly subjectId: string;
  readonly summary: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}
