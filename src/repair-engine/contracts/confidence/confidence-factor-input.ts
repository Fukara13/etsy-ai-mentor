import type { ConfidenceFactor } from './confidence-factor';

export interface ConfidenceFactorInput {
  readonly factor: ConfidenceFactor;
  readonly satisfied: boolean;
  readonly rationale: string;
}
