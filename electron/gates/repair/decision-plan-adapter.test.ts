/**
 * Gate-S16: Decision Plan Adapter — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { decisionToActionPlan } from './decision-plan-adapter';
import type { RepairDecision } from './repair-decision';

describe('Gate-S16: retry strategy -> retry_ci action plan', () => {
  it('produces retry_ci item', () => {
    const decision: RepairDecision = {
      failureClass: 'test_flake',
      strategy: 'retry',
      reason: 'Flaky test.',
    };
    const plan = decisionToActionPlan(decision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('retry_ci');
    expect(plan.items[0].reason).toBe('Flaky test.');
  });
});

describe('Gate-S16: human_escalation strategy -> request_human_intervention', () => {
  it('produces request_human_intervention item', () => {
    const decision: RepairDecision = {
      failureClass: 'policy_risk',
      strategy: 'human_escalation',
      reason: 'Policy risk; human required.',
    };
    const plan = decisionToActionPlan(decision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('request_human_intervention');
    expect(plan.items[0].reason).toBe('Policy risk; human required.');
  });
});

describe('Gate-S16: noop strategy -> noop action plan', () => {
  it('produces noop item', () => {
    const decision: RepairDecision = {
      failureClass: 'unknown',
      strategy: 'noop',
      reason: 'No action.',
    };
    const plan = decisionToActionPlan(decision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('noop');
  });
});

describe('Gate-S16: patch_candidate strategy -> safe bounded plan', () => {
  it('produces request_human_intervention (no automation expansion)', () => {
    const decision: RepairDecision = {
      failureClass: 'lint_error',
      strategy: 'patch_candidate',
      reason: 'Lint error; patch candidate allowed.',
    };
    const plan = decisionToActionPlan(decision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('request_human_intervention');
    expect(plan.items[0].reason).toBe('Lint error; patch candidate allowed.');
  });
});

describe('Gate-S16: invalid / unknown strategy -> safe failure', () => {
  it('invalid decision input produces request_human_intervention', () => {
    const plan = decisionToActionPlan(null as unknown as RepairDecision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('request_human_intervention');
    expect(plan.items[0].reason).toContain('Invalid');
  });

  it('unknown strategy produces request_human_intervention fallback', () => {
    const decision = {
      failureClass: 'unknown',
      strategy: 'merge',
      reason: 'x',
    } as unknown as RepairDecision;
    const plan = decisionToActionPlan(decision);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].action).toBe('request_human_intervention');
    expect(plan.items[0].reason).toContain('Unknown strategy');
  });
});

describe('Gate-S16: no unsupported action types', () => {
  const SUPPORTED = ['retry_ci', 'request_human_intervention', 'noop'] as const;

  it('all strategies produce only supported actions', () => {
    const decisions: RepairDecision[] = [
      { failureClass: 'test_flake', strategy: 'retry', reason: 'x' },
      { failureClass: 'policy_risk', strategy: 'human_escalation', reason: 'x' },
      { failureClass: 'lint_error', strategy: 'patch_candidate', reason: 'x' },
      { failureClass: 'unknown', strategy: 'noop', reason: 'x' },
    ];
    for (const d of decisions) {
      const plan = decisionToActionPlan(d);
      for (const item of plan.items) {
        expect(SUPPORTED).toContain(item.action);
      }
    }
  });
});
