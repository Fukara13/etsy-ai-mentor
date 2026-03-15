/**
 * OC-4: Normalized result of running heroes in advisory mode. Deterministic, testable.
 */

import type { RuntimeHeroStatus } from './runtime-hero-status';
import type { RuntimeHeroAdvisoryEntry } from './runtime-hero-advisory-entry';

export type HeroRuntimeFailureDetail = {
  readonly heroId?: string;
  readonly error: string;
};

export type HeroRuntimeResult = {
  readonly status: RuntimeHeroStatus;
  readonly selectedHeroIds: readonly string[];
  readonly advisoryEntries: readonly RuntimeHeroAdvisoryEntry[];
  readonly skippedReason?: string;
  readonly failureDetails?: readonly HeroRuntimeFailureDetail[];
};
