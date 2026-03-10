/**
 * RE-2: Deterministic intake result. No state transition applied.
 */

import type { RepairLifecycleState } from './repair-lifecycle-state'
import type { RepairEngineEvent } from './repair-engine-event'

export type RepairEngineEventIntakeResult = {
  readonly accepted: boolean
  readonly normalizedEvent?: RepairEngineEvent
  readonly recommendedInitialState: RepairLifecycleState
  readonly reasonCodes: readonly string[]
  readonly validationErrors: readonly string[]
}
