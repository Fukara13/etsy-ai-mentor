/**
 * RE-12: Binds project understanding to existing orchestrator/governance result.
 * Pure. Does not mutate input.
 */

import type { GovernanceBoundOrchestratorResult } from '../governance-runtime';
import type { ProjectUnderstandingRuntimeResult } from './project-understanding-runtime-result';
import type { ProjectUnderstandingArtifactBundleCompatible } from './project-understanding-runtime-input';
import { deriveProjectUnderstandingRuntime } from './derive-project-understanding-runtime';

export type ProjectUnderstandingBoundResult = GovernanceBoundOrchestratorResult & {
  readonly projectUnderstanding: ProjectUnderstandingRuntimeResult;
};

export type BindProjectUnderstandingInput = {
  readonly result: GovernanceBoundOrchestratorResult;
  readonly changedFiles: readonly string[];
  readonly artifactBundle: ProjectUnderstandingArtifactBundleCompatible;
};

/**
 * Binds project understanding to the governance-bound result.
 */
export function bindProjectUnderstandingRuntime(
  input: BindProjectUnderstandingInput
): ProjectUnderstandingBoundResult {
  const projectUnderstanding = deriveProjectUnderstandingRuntime({
    changedFiles: input.changedFiles,
    artifactBundle: input.artifactBundle,
  });
  return Object.freeze({
    ...input.result,
    projectUnderstanding,
  });
}
