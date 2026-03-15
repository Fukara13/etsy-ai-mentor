/**
 * OC-4: Single normalized advisory entry from a hero. Runtime-safe, serializable.
 */

export type RuntimeHeroAdvisoryEntry = {
  readonly heroId: string;
  readonly category: string;
  readonly summary: string;
  readonly rationale: string;
  readonly confidence?: number;
  readonly recommendedNextStep?: string;
  readonly signals?: readonly string[];
};
