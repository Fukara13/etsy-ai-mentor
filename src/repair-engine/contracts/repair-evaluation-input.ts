/**
 * RE-5: Input to the verdict engine.
 */

import type { RepairItem } from '../queue/repair-item'

export type RepairEvaluationInput = {
  readonly item: RepairItem
}
