/**
 * RE-9: Orchestrator stage names in canonical pipeline order.
 */

export const ORCHESTRATOR_STAGE_NAMES = [
  'INPUT_ACCEPTED',
  'INTAKE_NORMALIZED',
  'QUEUE_ENTRY_DERIVED',
  'STRATEGY_SELECTED',
  'RUN_INITIALIZED',
  'STATE_RESOLVED',
  'CONFIDENCE_EVALUATED',
  'VERDICT_PRODUCED',
  'ROUTING_RESOLVED',
  'ORCHESTRATION_COMPLETED',
] as const;

export type OrchestratorStageName = (typeof ORCHESTRATOR_STAGE_NAMES)[number];
