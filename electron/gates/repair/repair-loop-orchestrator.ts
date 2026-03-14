/**
 * Gate-S23: Bounded repair loop — Thin wrapper delegating to canonical orchestrator.
 * RE-10: All repair execution flows through runElectronRepairBridge.
 */

import type { RepairState } from './repair-state';
import type { RepairRunOutcome } from './repair-run-outcome';
import { runElectronRepairBridge } from '../../runtime/repair-engine-bridge';

export type LoopRunInput = {
  readonly initialState: RepairState;
  readonly retryCount?: number;
  readonly maxRetries?: number;
  readonly maxSteps?: number;
  readonly sessionId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

/**
 * Delegates to canonical repair-engine orchestrator via bridge.
 * Preserves LoopRunInput/RepairRunOutcome contract for callers.
 */
export function runBoundedRepairLoop(input: LoopRunInput): RepairRunOutcome {
  const bridgeResult = runElectronRepairBridge(input);
  return bridgeResult.outcome;
}
