/**
 * OC-3: Orchestration — decide refresh, then run CLI if needed.
 */

import * as path from 'path';
import { shouldRefreshProjectUnderstanding } from './should-refresh-project-understanding';
import { runProjectUnderstandingRefresh } from './run-project-understanding-refresh';
import type { ProjectUnderstandingRefreshResult } from './project-understanding-refresh-result';
import type { ProcessRunner } from './run-project-understanding-refresh';

const AI_DEVOS_DIR = '.ai-devos';
const ARTIFACT_FILES = [
  'dependency-graph.json',
  'module-map.json',
  'architecture-summary.json',
  'hotspot-report.json',
] as const;

export type FsAdapter = {
  getStat: (filePath: string) => Promise<{ exists: boolean; mtimeMs?: number }>;
};

function buildArtifactPaths(cwd: string): string[] {
  return ARTIFACT_FILES.map((f) => path.join(cwd, AI_DEVOS_DIR, f));
}

/**
 * Builds artifact stats from cwd and fs adapter.
 */
async function getArtifactStats(
  artifactPaths: string[],
  fsAdapter: FsAdapter
): Promise<Array<{ path: string; exists: boolean; mtimeMs?: number }>> {
  const stats = await Promise.all(
    artifactPaths.map(async (p) => {
      const stat = await fsAdapter.getStat(p);
      return { path: p, exists: stat.exists, mtimeMs: stat.mtimeMs };
    })
  );
  return stats;
}

/**
 * Orchestrates: build paths, read stats, decide refresh, run commands if needed.
 */
export async function refreshProjectUnderstanding(params: {
  cwd: string;
  freshnessWindowMs: number;
  forceRefresh?: boolean;
  eventCategory?: string;
  eventName?: string;
  fsAdapter: FsAdapter;
  processRunner: ProcessRunner;
}): Promise<ProjectUnderstandingRefreshResult> {
  const nowMs = Date.now();
  const startedAt = new Date(nowMs).toISOString();
  const artifactPaths = buildArtifactPaths(params.cwd);
  const artifactStats = await getArtifactStats(artifactPaths, params.fsAdapter);

  const decision = shouldRefreshProjectUnderstanding({
    artifactPaths,
    artifactStats,
    nowMs,
    freshnessWindowMs: params.freshnessWindowMs,
    forceRefresh: params.forceRefresh,
    eventCategory: params.eventCategory,
    eventName: params.eventName,
  });

  if (!decision.shouldRefresh) {
    return {
      status: 'skipped',
      reason: decision.reason,
      artifactPaths: [...artifactPaths],
      commandsRun: [],
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: 0,
    };
  }

  return runProjectUnderstandingRefresh({
    cwd: params.cwd,
    artifactPaths,
    processRunner: params.processRunner,
    startedAt,
    reasonForRefresh: decision.reason,
  });
}
