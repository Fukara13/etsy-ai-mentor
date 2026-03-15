/**
 * OC-4: Pure selection of eligible heroes from runtime input. No invocation.
 */

import type { HeroRuntimeInput } from './hero-runtime-input';
import type { RuntimeHeroSelectionResult } from './runtime-hero-selection-result';

/** Backbone category/action to single hero id. One event -> one hero. */
const BACKBONE_TO_HERO: Readonly<Record<string, string>> = {
  WORKFLOW_RUN_FAILURE: 'ciFailureHero',
  PULL_REQUEST_UPDATE_opened: 'reviewHero',
  PULL_REQUEST_UPDATE_synchronize: 'reviewHero',
  PULL_REQUEST_UPDATE_reopened: 'reviewHero',
  PUSH: 'reviewHero',
};

function toSelectionKey(category: string, action?: string): string {
  if (category === 'PULL_REQUEST_UPDATE' && action) {
    return `PULL_REQUEST_UPDATE_${action}`;
  }
  return category;
}

/**
 * Returns eligible hero ids or skipped reason. Deterministic; no I/O.
 */
export function selectHeroesForRuntime(input: HeroRuntimeInput): RuntimeHeroSelectionResult {
  const key = toSelectionKey(input.eventCategory, input.action);
  const heroId = BACKBONE_TO_HERO[key];
  if (heroId) {
    return { eligible: true, heroIds: [heroId], reason: `Event ${key} maps to ${heroId}` };
  }
  return {
    eligible: false,
    reason: input.eventCategory === 'UNKNOWN' ? 'Unknown event category' : `No hero mapped for ${key}`,
  };
}
