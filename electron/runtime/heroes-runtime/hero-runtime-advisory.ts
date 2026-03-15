/**
 * OC-4: Normalize hero execution output into runtime advisory entry. Pure mapping.
 */

import type { RuntimeHeroAdvisoryEntry } from './runtime-hero-advisory-entry';

/** Raw hero execution result shape from adapter (HeroExecutionResult-like). */
export type HeroExecutionOutput = {
  heroName: string;
  role: string;
  analysis: string;
  recommendations: readonly string[];
  confidence: number;
  advice?: {
    summary?: string;
    analysis?: string;
    suggestedActions?: readonly { title: string }[];
  };
};

/**
 * Maps a single hero execution output to a normalized advisory entry.
 */
export function toRuntimeAdvisoryEntry(output: HeroExecutionOutput): RuntimeHeroAdvisoryEntry {
  const summary = output.advice?.summary?.trim() || output.analysis?.slice(0, 200).trim() || 'No summary';
  const rationale = output.analysis?.trim() || output.advice?.analysis?.trim() || '';
  const recommendedNextStep =
    output.recommendations?.length > 0 ? output.recommendations[0] : undefined;
  const signals =
    output.advice?.suggestedActions?.map((a) => a.title).filter(Boolean) as string[] | undefined;

  return Object.freeze({
    heroId: output.heroName,
    category: output.role,
    summary,
    rationale,
    confidence: output.confidence,
    recommendedNextStep,
    signals: signals?.length ? signals : undefined,
  });
}
