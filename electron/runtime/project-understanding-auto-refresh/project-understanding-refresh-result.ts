/**
 * OC-3: Typed result for project-understanding refresh. Runtime-safe, serializable.
 */

export type ProjectUnderstandingRefreshReason =
  | 'force-refresh'
  | 'missing-artifact'
  | 'stale-artifact'
  | 'event-requires-refresh'
  | 'fresh-enough'
  | 'refresh-command-failed';

export type ProjectUnderstandingRefreshStatus = 'refreshed' | 'skipped' | 'failed';

export type ProjectUnderstandingRefreshResult = {
  status: ProjectUnderstandingRefreshStatus;
  reason: ProjectUnderstandingRefreshReason;
  artifactPaths: string[];
  commandsRun: string[];
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
};
