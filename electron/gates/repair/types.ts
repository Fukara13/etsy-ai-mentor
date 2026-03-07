/**
 * Gate-S10: Repair Loop Typed Contracts
 * Explicit contracts for the autonomous repair pipeline.
 * Single write actor = Jules. Final authority = Human.
 */

/** Result from GPT Failure Analyzer (analysis-only, no code changes). */
export type AnalyzerResult = {
  readonly ok: boolean;
  readonly summary: string;
  readonly suggestedActions?: readonly string[];
  readonly failureReason?: string;
};

/** Result from Repair Coach (guidance for Jules). */
export type CoachResult = {
  readonly ok: boolean;
  readonly guidance: string;
  readonly scope?: readonly string[];
  readonly warnings?: readonly string[];
};

/**
 * Jules step result. When frozen, no real patch is created.
 * Placeholder contract only — no real patch generation.
 */
export type JulesStepResult =
  | {
      readonly status: 'skipped_due_to_freeze';
      readonly patch: null;
      readonly reason?: string;
    }
  | {
      readonly status: 'patch_produced';
      readonly patch: unknown;
      readonly summary?: string;
    };

/** Create frozen Jules result. Patch is always null. */
export function createJulesFrozenResult(reason?: string): JulesStepResult {
  return { status: 'skipped_due_to_freeze', patch: null, reason };
}

/** Guardian policy decision. Only Jules can produce patches; Guardian validates them. */
export type GuardianDecision = {
  readonly allowed: boolean;
  readonly reason: string;
  readonly violations?: readonly string[];
};

/** Evaluator quality gate. CI passed alone is not sufficient. */
export type EvaluatorDecision = {
  readonly passed: boolean;
  readonly reason: string;
  readonly qualityFlags?: {
    readonly ciPassed?: boolean;
    readonly policyOk?: boolean;
    readonly noSuspiciousEdits?: boolean;
  };
};

/** Retry accounting state. Max 3 attempts. */
export type RetryState = {
  readonly attempt: number;
  readonly maxAttempts: 3;
  readonly exhausted: boolean;
};

/** Full repair loop pipeline state. */
export type RepairLoopState =
  | { phase: 'IDLE' }
  | { phase: 'ANALYZE'; ciFailed: boolean }
  | { phase: 'COACH'; analyzer: AnalyzerResult }
  | { phase: 'JULES_PENDING'; coach: CoachResult }
  | { phase: 'JULES_FROZEN'; julesResult: JulesStepResult; retry: RetryState }
  | { phase: 'GUARDIAN_CHECK'; patchSummary?: string }
  | { phase: 'EVALUATOR_CHECK'; guardian: GuardianDecision }
  | { phase: 'CI_RETRY'; evaluator: EvaluatorDecision; retry: RetryState }
  | { phase: 'EXHAUSTED'; retry: RetryState; message: string }
  | { phase: 'HUMAN'; retry: RetryState };

/** Canonical exhaustion message when retry reaches 3/3. */
export const EXHAUSTION_MESSAGE =
  'Auto-remediation exhausted (3/3). Manual intervention required.';

/** Only Jules is allowed as the write actor (patch/commit/PR update). */
export const WRITE_ACTOR = 'Jules' as const;
