/**
 * Gate-S29: GPT Analysis Layer — Analysis-only contracts.
 */

export interface GPTAnalysisInput {
  readonly failureSummary: string;
  readonly failingStep?: string;
  readonly logExcerpt?: string;
  readonly retryCount: number;
  readonly repairState: string;
  readonly governanceFlags?: readonly string[];
}

export interface GPTAnalysisResult {
  readonly summary: string;
  readonly hypotheses: readonly string[];
  readonly confidence: number;
  readonly recommendedAction?: string;
  readonly riskFlags?: readonly string[];
  readonly requiresHuman: boolean;
}
