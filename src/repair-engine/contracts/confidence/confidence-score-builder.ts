import type { ConfidenceLevel } from './confidence-level';
import type { ConfidenceFactor } from './confidence-factor';
import type { ConfidenceFactorInput } from './confidence-factor-input';
import type { ConfidenceScore } from './confidence-score';

const MIN_VALUE = 0;
const MAX_VALUE = 100;

const LOW_THRESHOLD = 39;
const MEDIUM_THRESHOLD = 74;

function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value) as Readonly<T>;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const prop = obj[key];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop);
    }
  }
  return Object.freeze(obj) as Readonly<T>;
}

function normalizeNonEmptyRationale(value: string, factor: ConfidenceFactor): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`ConfidenceFactorInput requires non-empty rationale for factor '${factor}'.`);
  }
  return normalized;
}

function validateUniqueFactors(inputs: ConfidenceFactorInput[]): void {
  const seen = new Set<ConfidenceFactor>();
  for (const input of inputs) {
    if (seen.has(input.factor)) {
      throw new Error(`ConfidenceScore requires unique factors; duplicate '${input.factor}'.`);
    }
    seen.add(input.factor);
  }
}

function valueToLevel(value: number): ConfidenceLevel {
  if (value <= LOW_THRESHOLD) return 'low';
  if (value <= MEDIUM_THRESHOLD) return 'medium';
  return 'high';
}

export function buildConfidenceScore(inputs: ConfidenceFactorInput[]): ConfidenceScore {
  if (inputs.length === 0) {
    throw new Error('ConfidenceScore requires at least one factor.');
  }

  validateUniqueFactors(inputs);

  const validatedInputs = inputs.map((input) => ({
    factor: input.factor,
    satisfied: input.satisfied,
    rationale: normalizeNonEmptyRationale(input.rationale, input.factor),
  }));

  const satisfiedCount = validatedInputs.filter((i) => i.satisfied).length;
  const rawScore = (satisfiedCount / validatedInputs.length) * MAX_VALUE;
  const value = Math.floor(Math.min(Math.max(rawScore, MIN_VALUE), MAX_VALUE));
  const level = valueToLevel(value);

  const factors = deepFreeze([...validatedInputs]) as readonly Readonly<ConfidenceFactorInput>[];

  const score: ConfidenceScore = {
    level,
    value,
    factors,
  };

  return Object.freeze(score);
}
