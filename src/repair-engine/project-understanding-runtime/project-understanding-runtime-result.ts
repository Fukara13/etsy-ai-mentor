/**
 * RE-12: Runtime project understanding result.
 */

export type ProjectUnderstandingArtifactStatus =
  | 'available'
  | 'partial'
  | 'missing';

export type ProjectUnderstandingRuntimeResult = {
  readonly artifactStatus: ProjectUnderstandingArtifactStatus;
  readonly architecturalLayer: string | null;
  readonly moduleName: string | null;
  readonly moduleOwner: string | null;
  readonly moduleHotspotScore: number | null;
  readonly moduleRiskLevel: string | null;
  readonly dependencyBlastRadius: number | null;
  readonly summarySignals: readonly string[];
};
