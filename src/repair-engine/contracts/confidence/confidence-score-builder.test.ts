import { describe, it, expect } from 'vitest';

import { buildConfidenceScore } from './confidence-score-builder';
import type { ConfidenceFactorInput } from './confidence-factor-input';

function makeInput(
  overrides: Partial<ConfidenceFactorInput> & Pick<ConfidenceFactorInput, 'factor' | 'rationale'>
): ConfidenceFactorInput {
  return {
    satisfied: true,
    ...overrides,
  };
}

describe('buildConfidenceScore', () => {
  const ALL_FACTORS: ConfidenceFactorInput[] = [
    makeInput({ factor: 'execution_contract_present', rationale: 'Contract exists' }),
    makeInput({ factor: 'known_error_classification', rationale: 'Error classified' }),
    makeInput({ factor: 'event_log_available', rationale: 'Log available' }),
    makeInput({ factor: 'signal_consistency', rationale: 'Signals consistent' }),
  ];

  it('builds HIGH confidence when all factors are satisfied', () => {
    const score = buildConfidenceScore(ALL_FACTORS);

    expect(score.level).toBe('high');
    expect(score.value).toBe(100);
    expect(score.factors).toHaveLength(4);
  });

  it('builds MEDIUM confidence when some factors are satisfied', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', satisfied: true, rationale: 'A' }),
      makeInput({ factor: 'known_error_classification', satisfied: true, rationale: 'B' }),
      makeInput({ factor: 'event_log_available', satisfied: false, rationale: 'C' }),
      makeInput({ factor: 'signal_consistency', satisfied: false, rationale: 'D' }),
    ];

    const score = buildConfidenceScore(inputs);

    expect(score.level).toBe('medium');
    expect(score.value).toBe(50);
  });

  it('builds LOW confidence when few/no factors are satisfied', () => {
    const allUnsatisfied: ConfidenceFactorInput[] = ALL_FACTORS.map((f) => ({
      ...f,
      satisfied: false,
    }));

    const score = buildConfidenceScore(allUnsatisfied);

    expect(score.level).toBe('low');
    expect(score.value).toBe(0);
  });

  it('builds LOW when one of four factors satisfied (25%)', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', satisfied: true, rationale: 'A' }),
      makeInput({ factor: 'known_error_classification', satisfied: false, rationale: 'B' }),
      makeInput({ factor: 'event_log_available', satisfied: false, rationale: 'C' }),
      makeInput({ factor: 'signal_consistency', satisfied: false, rationale: 'D' }),
    ];

    const score = buildConfidenceScore(inputs);

    expect(score.level).toBe('low');
    expect(score.value).toBe(25);
  });

  it('rejects empty factor arrays', () => {
    expect(() => buildConfidenceScore([])).toThrow(
      'ConfidenceScore requires at least one factor.'
    );
  });

  it('rejects duplicate factors', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', rationale: 'A' }),
      makeInput({ factor: 'execution_contract_present', rationale: 'B' }),
    ];

    expect(() => buildConfidenceScore(inputs)).toThrow(
      "ConfidenceScore requires unique factors; duplicate 'execution_contract_present'."
    );
  });

  it('rejects empty or whitespace-only rationale', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', rationale: '   ' }),
    ];

    expect(() => buildConfidenceScore(inputs)).toThrow(
      "ConfidenceFactorInput requires non-empty rationale for factor 'execution_contract_present'."
    );

    expect(() =>
      buildConfidenceScore([
        makeInput({ factor: 'execution_contract_present', rationale: '' }),
      ])
    ).toThrow();
  });

  it('returns deeply frozen structures', () => {
    const score = buildConfidenceScore(ALL_FACTORS);

    expect(Object.isFrozen(score)).toBe(true);
    expect(Object.isFrozen(score.factors)).toBe(true);
    for (const f of score.factors) {
      expect(Object.isFrozen(f)).toBe(true);
    }
  });

  it('does not mutate input arrays or input objects', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', rationale: 'rationale' }),
    ];
    const inputsSnapshot = JSON.parse(JSON.stringify(inputs));

    buildConfidenceScore(inputs);

    expect(inputs).toEqual(inputsSnapshot);
  });

  it('produces stable deterministic output for the same input', () => {
    const inputs: ConfidenceFactorInput[] = [
      makeInput({ factor: 'execution_contract_present', satisfied: true, rationale: 'A' }),
      makeInput({ factor: 'known_error_classification', satisfied: false, rationale: 'B' }),
    ];

    const first = buildConfidenceScore(inputs);
    const second = buildConfidenceScore(inputs);

    expect(first).toEqual(second);
    expect(first.level).toBe(second.level);
    expect(first.value).toBe(second.value);
  });
});
