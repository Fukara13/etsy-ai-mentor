/**
 * OC-4: Orchestration — select heroes, invoke in advisory mode, return normalized result.
 */

import type { HeroRuntimeInput } from './hero-runtime-input';
import type { HeroRuntimeResult, HeroRuntimeFailureDetail } from './hero-runtime-result';
import type { RuntimeHeroAdvisoryEntry } from './runtime-hero-advisory-entry';
import { selectHeroesForRuntime } from './hero-runtime-selection';
import { invokeHeroAdvisory } from './hero-runtime-invocation';
import type { HeroAdvisoryRunner } from './hero-runtime-invocation';

/**
 * Runs hero layer in advisory mode: select eligible heroes, invoke each, normalize.
 * Fail-safe: partial/failed status with typed details; no hidden crash.
 */
export async function runHeroesRuntime(
  input: HeroRuntimeInput,
  runner: HeroAdvisoryRunner
): Promise<HeroRuntimeResult> {
  const selection = selectHeroesForRuntime(input);

  if (!selection.eligible) {
    return Object.freeze({
      status: 'skipped',
      selectedHeroIds: [],
      advisoryEntries: [],
      skippedReason: selection.reason,
    });
  }

  const advisoryEntries: RuntimeHeroAdvisoryEntry[] = [];
  const failureDetails: HeroRuntimeFailureDetail[] = [];

  for (const heroId of selection.heroIds) {
    const outcome = await invokeHeroAdvisory(heroId, input, runner);
    if (outcome.ok) {
      advisoryEntries.push(outcome.entry);
    } else {
      failureDetails.push({ heroId: outcome.heroId, error: outcome.error });
    }
  }

  if (advisoryEntries.length === selection.heroIds.length) {
    return Object.freeze({
      status: 'completed',
      selectedHeroIds: [...selection.heroIds],
      advisoryEntries,
      failureDetails: failureDetails.length ? failureDetails : undefined,
    });
  }

  if (advisoryEntries.length > 0) {
    return Object.freeze({
      status: 'partial',
      selectedHeroIds: [...selection.heroIds],
      advisoryEntries,
      failureDetails: failureDetails.length ? failureDetails : undefined,
    });
  }

  return Object.freeze({
    status: 'failed',
    selectedHeroIds: [...selection.heroIds],
    advisoryEntries: [],
    failureDetails: failureDetails.length ? failureDetails : undefined,
  });
}
