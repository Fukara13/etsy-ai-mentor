/**
 * OC-9: Stable stage model for operator bridge path.
 * Closed set; order matches pipeline flow.
 */

export const BRIDGE_PATH_STAGES = [
  'webhook-intake',
  'pr-inspection',
  'hero-analysis',
  'governance',
  'advisory-projection',
] as const

export type OperatorBridgePathStage = (typeof BRIDGE_PATH_STAGES)[number]

export function getBridgePathStageOrder(): readonly OperatorBridgePathStage[] {
  return BRIDGE_PATH_STAGES
}
