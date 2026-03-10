/**
 * RE-3: Repair strategy family type.
 */

export const REPAIR_STRATEGY_TYPES = [
  'test_fix',
  'dependency_fix',
  'configuration_fix',
  'manual_investigation',
] as const

export type RepairStrategyType = (typeof REPAIR_STRATEGY_TYPES)[number]
