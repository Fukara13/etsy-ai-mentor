/**
 * HM-7: Decision option.
 * A single actionable choice for the operator.
 */

import type { DecisionIntent } from './decision.intent'

export type DecisionOption = {
  id: string
  label: string
  description: string
  actionType: DecisionIntent
  recommended: boolean
  destructive: boolean
  disabled: boolean
  disabledReason?: string
}
