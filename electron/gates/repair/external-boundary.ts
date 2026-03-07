/**
 * Gate-S26: External System Boundary — Entry point and re-exports.
 */

export { mapRepairExternalProjection } from './external-boundary-mapper';
export type { MapRepairExternalProjectionParams } from './external-boundary-mapper';
export type {
  RepairExternalProjection,
  ProjectionTarget,
  ProjectionStatus,
  RecommendedAction,
  ProjectionMetadata,
} from './external-boundary.types';
