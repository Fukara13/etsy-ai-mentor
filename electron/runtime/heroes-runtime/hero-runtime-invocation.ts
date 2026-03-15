/**
 * OC-4: Invoke a single hero in advisory mode and normalize result. No execution authority.
 */

import type { HeroRuntimeInput } from './hero-runtime-input';
import type { RuntimeHeroAdvisoryEntry } from './runtime-hero-advisory-entry';
import type { HeroExecutionOutput } from './hero-runtime-advisory';
import { toRuntimeAdvisoryEntry } from './hero-runtime-advisory';

/** Adapter: run hero by id with context, return execution output or throw. */
export type HeroAdvisoryRunner = (
  heroId: string,
  context: HeroExecutionContext
) => Promise<HeroExecutionOutput>;

/** Context passed to hero (safe fields only). */
export type HeroExecutionContext = {
  event: string;
  subject?: string;
  repository?: string;
  pullRequestNumber?: number;
  summary?: string;
  signals?: string[];
  metadata?: Record<string, unknown>;
};

function inputToExecutionContext(input: HeroRuntimeInput): HeroExecutionContext {
  return {
    event: input.eventKind || input.eventCategory,
    subject: input.subjectId,
    repository: input.repositoryFullName,
    summary: input.summary,
    metadata: {
      deliveryId: input.deliveryId,
      hasArtifactBundle: input.hasArtifactBundle,
      changedFileCount: input.changedFilePaths?.length ?? 0,
    },
  };
}

/**
 * Invokes one hero in advisory mode; returns normalized entry or failure detail.
 * Catches errors and returns failure instead of throwing.
 */
export async function invokeHeroAdvisory(
  heroId: string,
  input: HeroRuntimeInput,
  runner: HeroAdvisoryRunner
): Promise<
  | { ok: true; entry: RuntimeHeroAdvisoryEntry }
  | { ok: false; heroId: string; error: string }
> {
  const context = inputToExecutionContext(input);
  try {
    const output = await runner(heroId, context);
    if (!output || typeof output.analysis !== 'string') {
      return { ok: false, heroId, error: 'Malformed hero advisory result' };
    }
    const entry = toRuntimeAdvisoryEntry(output as HeroExecutionOutput);
    return { ok: true, entry };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { ok: false, heroId, error };
  }
}
