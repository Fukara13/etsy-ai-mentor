/**
 * Gate-S25: Operator handoff — Entry point and re-exports.
 */

export { mapRepairOperatorHandoff } from './operator-handoff-mapper';
export type { MapRepairOperatorHandoffParams } from './operator-handoff-mapper';
export type {
  RepairOperatorHandoff,
  HandoffIntent,
  NextAction,
} from './operator-handoff.types';
