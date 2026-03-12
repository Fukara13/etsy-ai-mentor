import type { ConfidenceLevel } from './confidence-level';
import type { ConfidenceFactorInput } from './confidence-factor-input';

export interface ConfidenceScore {
  readonly level: ConfidenceLevel;
  readonly value: number;
  readonly factors: readonly Readonly<ConfidenceFactorInput>[];
}
