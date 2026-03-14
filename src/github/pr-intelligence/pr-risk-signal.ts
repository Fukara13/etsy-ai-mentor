/**
 * GH-8: PR risk signals.
 */

export interface PrRiskSignals {
  readonly touchesDependencies: boolean;
  readonly touchesConfig: boolean;
  readonly touchesGithubWorkflow: boolean;
  readonly touchesTests: boolean;
  readonly touchesDocs: boolean;
  readonly touchesSource: boolean;
  readonly touchesCorePaths: boolean;
  readonly hasLargeDiff: boolean;
  readonly hasFileRemovals: boolean;
  readonly hasRenames: boolean;
  readonly hasUnknownFileStatus: boolean;
  readonly isCrossAreaChange: boolean;
}
