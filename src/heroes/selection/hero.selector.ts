/**
 * HM-3: Deterministic event-to-hero selection.
 * One event -> one hero. Rule-based mapping only.
 */

import type { HeroRegistry } from '../core/hero.registry'
import type { HeroEvent } from './hero.events'
import type { HeroSelectionResult } from './hero.selection-result'

const EVENT_TO_HERO: Readonly<Record<HeroEvent, string>> = {
  CI_FAILURE: 'ciFailureHero',
  RETRY_EXHAUSTED: 'escalationHero',
  PR_OPENED: 'reviewHero',
  PR_UPDATED: 'reviewHero',
  REPAIR_ANALYSIS_REQUESTED: 'analysisHero',
}

const ERR_UNKNOWN_EVENT = 'Unknown hero event'
const ERR_HERO_NOT_REGISTERED = 'Selected hero is not registered'

function isKnownEvent(event: string): event is HeroEvent {
  return event in EVENT_TO_HERO
}

export class HeroSelector {
  constructor(private readonly registry: HeroRegistry) {}

  select(event: HeroEvent): HeroSelectionResult {
    if (!isKnownEvent(event)) {
      throw new Error(`${ERR_UNKNOWN_EVENT}: ${event}`)
    }

    const selectedHeroId = EVENT_TO_HERO[event]
    const hero = this.registry.getByName(selectedHeroId)
    if (!hero) {
      throw new Error(`${ERR_HERO_NOT_REGISTERED}: ${selectedHeroId}`)
    }

    return {
      event,
      selectedHeroId,
      reason: `Event ${event} maps to ${selectedHeroId}`,
    }
  }
}
