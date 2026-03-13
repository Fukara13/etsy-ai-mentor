/**
 * GH-1: Risk levels for repair action classification.
 * Deterministic, immutable values.
 */

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const RISK_LEVELS: readonly RiskLevel[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
] as const;
