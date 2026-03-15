/**
 * OC-12: Stable stage model for operator advisory evolution timeline.
 * Advisory formation/evolution only; not incident pipeline.
 */

export const ADVISORY_EVOLUTION_STAGES = [
  'hero-analysis',
  'governance-evaluated',
  'bridge-path-derived',
  'advisory-generated',
  'operator-view-ready',
] as const

export type OperatorAdvisoryEvolutionStage = (typeof ADVISORY_EVOLUTION_STAGES)[number]

export function getAdvisoryEvolutionStageOrder(): readonly OperatorAdvisoryEvolutionStage[] {
  return ADVISORY_EVOLUTION_STAGES
}
