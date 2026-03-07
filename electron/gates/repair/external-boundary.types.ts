/**
 * Gate-S26: External System Boundary — Transport-agnostic projection types.
 */

/** Target for the projection (operator, human, system). */
export type ProjectionTarget = 'operator' | 'human' | 'system';

/** Status for external consumers. Aligned with verdict status. */
export type ProjectionStatus =
  | 'resolved'
  | 'requires_human'
  | 'halted'
  | 'blocked';

/** Recommended action for the transport recipient. */
export type RecommendedAction =
  | 'close_safe'
  | 'retry_safe'
  | 'review_required'
  | 'manual_repair_required'
  | 'blocked_no_action';

/** Optional metadata from outcome enrichment. */
export type ProjectionMetadata = {
  readonly sessionId?: string;
  readonly totalSteps?: number;
};

/** Canonical external projection. Transport-ready, no domain coupling. */
export interface RepairExternalProjection {
  readonly projectionTarget: ProjectionTarget;
  readonly projectionStatus: ProjectionStatus;
  readonly projectionMessage: string;
  readonly recommendedAction: RecommendedAction;
  readonly requiresHuman: boolean;
  readonly safeToRetry: boolean;
  readonly safeToClose: boolean;
  readonly finalState: string;
  readonly reasonCode: string;
  readonly summary: string;
  readonly metadata?: ProjectionMetadata;
}
