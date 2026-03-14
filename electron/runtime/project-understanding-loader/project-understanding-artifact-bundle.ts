/**
 * RE-12: Bundle contract for loaded .ai-devos artifacts.
 * Each field may be null if file is missing or invalid.
 */

export type ProjectUnderstandingArtifactBundle = {
  readonly architectureSummary: Record<string, unknown> | null;
  readonly dependencyGraph: Record<string, unknown> | null;
  readonly moduleMap: Record<string, unknown> | null;
  readonly riskHotspots: Record<string, unknown> | null;
};
