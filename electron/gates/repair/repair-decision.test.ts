/**
 * Gate-S15: Repair Decision Intelligence — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { classifyFailure, type FailureSignal } from './failure-classifier';
import { selectRepairStrategy } from './repair-strategy';
import { buildRepairDecision } from './repair-decision';

describe('Gate-S15: policy risk always wins', () => {
  it('hasPolicyRisk=true => policy_risk regardless of category', () => {
    expect(classifyFailure({ hasPolicyRisk: true })).toBe('policy_risk');
    expect(classifyFailure({ category: 'test', hasPolicyRisk: true })).toBe('policy_risk');
    expect(classifyFailure({ category: 'lint', hasPolicyRisk: true })).toBe('policy_risk');
  });
});

describe('Gate-S15: flaky/timeout test => retry', () => {
  it('category=test and flaky => test_flake', () => {
    expect(classifyFailure({ category: 'test', summary: 'flaky test failed' })).toBe('test_flake');
  });

  it('category=test and timeout => test_flake', () => {
    expect(classifyFailure({ category: 'test', summary: 'test timeout after 30s' })).toBe(
      'test_flake'
    );
  });

  it('selectRepairStrategy(test_flake) => retry', () => {
    expect(selectRepairStrategy('test_flake')).toBe('retry');
  });
});

describe('Gate-S15: lint => patch_candidate', () => {
  it('category=lint => lint_error', () => {
    expect(classifyFailure({ category: 'lint' })).toBe('lint_error');
  });

  it('selectRepairStrategy(lint_error) => patch_candidate', () => {
    expect(selectRepairStrategy('lint_error')).toBe('patch_candidate');
  });
});

describe('Gate-S15: compile => patch_candidate', () => {
  it('category=compile => compile_error', () => {
    expect(classifyFailure({ category: 'compile' })).toBe('compile_error');
  });

  it('selectRepairStrategy(compile_error) => patch_candidate', () => {
    expect(selectRepairStrategy('compile_error')).toBe('patch_candidate');
  });
});

describe('Gate-S15: dependency => patch_candidate', () => {
  it('category=dependency => dependency_error', () => {
    expect(classifyFailure({ category: 'dependency' })).toBe('dependency_error');
  });

  it('selectRepairStrategy(dependency_error) => patch_candidate', () => {
    expect(selectRepairStrategy('dependency_error')).toBe('patch_candidate');
  });
});

describe('Gate-S15: unknown => human_escalation', () => {
  it('unrecognized category => unknown', () => {
    expect(classifyFailure({ category: 'other' })).toBe('unknown');
  });

  it('selectRepairStrategy(unknown) => human_escalation', () => {
    expect(selectRepairStrategy('unknown')).toBe('human_escalation');
  });

  it('selectRepairStrategy(policy_risk) => human_escalation', () => {
    expect(selectRepairStrategy('policy_risk')).toBe('human_escalation');
  });
});

describe('Gate-S15: reason strings are stable and exact', () => {
  it('buildRepairDecision produces exact reason for each class', () => {
    expect(buildRepairDecision({ category: 'test', summary: 'flaky' }).reason).toBe(
      'Failure classified as flaky/timeout-prone test behavior.'
    );
    expect(buildRepairDecision({ category: 'lint' }).reason).toBe(
      'Failure classified as lint error; patch candidate allowed.'
    );
    expect(buildRepairDecision({ category: 'compile' }).reason).toBe(
      'Failure classified as compile error; patch candidate allowed.'
    );
    expect(buildRepairDecision({ category: 'dependency' }).reason).toBe(
      'Failure classified as dependency error; patch candidate allowed.'
    );
    expect(buildRepairDecision({ hasPolicyRisk: true }).reason).toBe(
      'Failure classified as policy risk; human escalation required.'
    );
    expect(buildRepairDecision({ category: 'other' }).reason).toBe(
      'Failure could not be classified safely; human escalation required.'
    );
  });
});

describe('Gate-S15: classifier handles undefined/empty input safely', () => {
  it('null/undefined signal => unknown', () => {
    expect(classifyFailure(null as unknown as FailureSignal)).toBe('unknown');
  });

  it('empty object => unknown', () => {
    expect(classifyFailure({})).toBe('unknown');
  });

  it('empty summary and category => unknown', () => {
    expect(classifyFailure({ summary: '', category: '' })).toBe('unknown');
  });
});
