/**
 * OC-4: Heroes runtime integration. Advisory only; no execution authority.
 */

export type { HeroRuntimeInput } from './hero-runtime-input';
export type { HeroRuntimeResult, HeroRuntimeFailureDetail } from './hero-runtime-result';
export type { RuntimeHeroAdvisoryEntry } from './runtime-hero-advisory-entry';
export type { RuntimeHeroStatus } from './runtime-hero-status';
export type { RuntimeHeroSelectionResult } from './runtime-hero-selection-result';
export type { RuntimeHeroId } from './runtime-hero-id';

export { selectHeroesForRuntime } from './hero-runtime-selection';
export { toRuntimeAdvisoryEntry } from './hero-runtime-advisory';
export type { HeroExecutionOutput } from './hero-runtime-advisory';
export { invokeHeroAdvisory } from './hero-runtime-invocation';
export type { HeroAdvisoryRunner, HeroExecutionContext } from './hero-runtime-invocation';
export { runHeroesRuntime } from './run-heroes-runtime';
export { createDefaultHeroAdvisoryRunner } from './default-runtime-hero-adapters';
