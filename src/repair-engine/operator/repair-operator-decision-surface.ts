/**
 * RE-7: Presentation-oriented operator decision surface.
 */

import type { RepairOperatorActionType } from '../routing/repair-operator-decision'

export type RepairOperatorDecisionSurface = {
  readonly headline: string
  readonly summary: string
  readonly analysis: string
  readonly recommendedActionType: RepairOperatorActionType
  readonly actions: readonly {
    readonly type: RepairOperatorActionType
    readonly label: string
    readonly description: string
    readonly recommended: boolean
    readonly destructive: boolean
  }[]
  readonly riskLevel: 'low' | 'medium' | 'high'
  readonly confidence: number
  readonly reasonCodes: readonly string[]
  readonly operatorGuidance: readonly string[]
}
