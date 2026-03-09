/**
 * HM-3: Normalized selection result.
 */

import type { HeroEvent } from './hero.events'

export type HeroSelectionResult = {
  event: HeroEvent
  selectedHeroId: string
  reason: string
}
