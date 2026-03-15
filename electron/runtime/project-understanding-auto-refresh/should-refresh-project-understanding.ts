/**
 * OC-3: Pure decision function for whether to refresh project-understanding artifacts.
 */

export type ShouldRefreshReason =
  | 'force-refresh'
  | 'missing-artifact'
  | 'stale-artifact'
  | 'event-requires-refresh'
  | 'fresh-enough';

export type ArtifactStat = {
  path: string;
  exists: boolean;
  mtimeMs?: number;
};

export type ShouldRefreshInput = {
  artifactPaths: string[];
  artifactStats: ArtifactStat[];
  nowMs: number;
  freshnessWindowMs: number;
  forceRefresh?: boolean;
  eventCategory?: string;
  eventName?: string;
};

export type ShouldRefreshOutput = {
  shouldRefresh: boolean;
  reason: ShouldRefreshReason;
};

const REPO_CHANGING_CATEGORIES = new Set([
  'PUSH',
  'PULL_REQUEST_UPDATE',
  'WORKFLOW_RUN_FAILURE',
]);

const REPO_CHANGING_EVENT_NAMES = new Set([
  'push',
  'pull_request',
  'workflow_run',
]);

function isRepoChangingEvent(category?: string, eventName?: string): boolean {
  if (category && REPO_CHANGING_CATEGORIES.has(category)) return true;
  const name = (eventName ?? '').toLowerCase().trim();
  return name.length > 0 && REPO_CHANGING_EVENT_NAMES.has(name);
}

/**
 * Decides if project-understanding artifacts should be refreshed.
 * Order: forceRefresh → missing artifact → stale → event-requires-refresh → fresh-enough.
 */
export function shouldRefreshProjectUnderstanding(
  input: ShouldRefreshInput
): ShouldRefreshOutput {
  if (input.forceRefresh === true) {
    return { shouldRefresh: true, reason: 'force-refresh' };
  }

  const pathSet = new Set(input.artifactPaths);
  for (const stat of input.artifactStats) {
    if (!pathSet.has(stat.path)) continue;
    if (!stat.exists) {
      return { shouldRefresh: true, reason: 'missing-artifact' };
    }
  }

  const requiredPaths = new Set(input.artifactPaths);
  for (const stat of input.artifactStats) {
    if (!requiredPaths.has(stat.path) || !stat.exists) continue;
    const mtime = stat.mtimeMs ?? 0;
    if (input.nowMs - mtime > input.freshnessWindowMs) {
      return { shouldRefresh: true, reason: 'stale-artifact' };
    }
  }

  if (isRepoChangingEvent(input.eventCategory, input.eventName)) {
    return { shouldRefresh: true, reason: 'event-requires-refresh' };
  }

  return { shouldRefresh: false, reason: 'fresh-enough' };
}
