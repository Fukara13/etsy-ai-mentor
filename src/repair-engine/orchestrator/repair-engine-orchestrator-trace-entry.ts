/**
 * RE-9: Trace entry for pipeline stage.
 */

import type { OrchestratorStageName } from './orchestrator-stage-name';

export type RepairEngineOrchestratorTraceEntry = {
  readonly stage: OrchestratorStageName;
  readonly order: number;
  readonly summary: string;
};
