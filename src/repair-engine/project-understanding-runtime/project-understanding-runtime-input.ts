/**
 * RE-12: Input contract for deriving runtime project understanding.
 */

/** Artifact bundle shape compatible with loaded .ai-devos JSON. */
export type ProjectUnderstandingArtifactBundleCompatible = {
  readonly architectureSummary: Record<string, unknown> | null;
  readonly dependencyGraph: Record<string, unknown> | null;
  readonly moduleMap: Record<string, unknown> | null;
  readonly riskHotspots: Record<string, unknown> | null;
};

export type ProjectUnderstandingRuntimeInput = {
  readonly changedFiles: readonly string[];
  readonly artifactBundle: ProjectUnderstandingArtifactBundleCompatible;
};
