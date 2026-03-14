/**
 * RE-11: Deterministic tests for governance runtime binding.
 */

import { describe, it, expect } from 'vitest';
import { bindGovernanceRuntime } from './bind-governance-runtime';
import { orchestrateRepairEngine } from '../orchestrator';
import type { RepairEngineOrchestratorInput } from '../orchestrator';

function makeInput(): RepairEngineOrchestratorInput {
  return Object.freeze({
    event: Object.freeze({
      type: 'CI_FAILURE',
      source: 'ci',
      subjectId: 'run-123',
      summary: 'CI failed',
      attemptCount: 0,
    }),
  });
}

describe('RE-11: bindGovernanceRuntime', () => {
  describe('allow path', () => {
    it('strategy_ready with test_fix yields governance with executionAllowed or require review', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const bound = bindGovernanceRuntime(orchResult);

      expect(bound.governance).toBeDefined();
      expect(typeof bound.governance.decision).toBe('string');
      expect(typeof bound.governance.executionAllowed).toBe('boolean');
      expect(typeof bound.governance.requiresOperatorReview).toBe('boolean');
      expect(typeof bound.governance.requiresEscalation).toBe('boolean');
      expect(bound.governance.sourcePolicyEffect).toBeDefined();
      expect(bound.governance.sourcePolicyRule).toBeDefined();
    });
  });

  describe('operator review path', () => {
    it('governance preserves requiresOperatorReview when applicable', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const bound = bindGovernanceRuntime(orchResult);

      expect(['ALLOW_EXECUTION', 'REQUIRE_OPERATOR_REVIEW', 'BLOCK_AND_ESCALATE']).toContain(
        bound.governance.decision
      );
      if (bound.governance.decision === 'REQUIRE_OPERATOR_REVIEW') {
        expect(bound.governance.requiresOperatorReview).toBe(true);
      }
    });
  });

  describe('block and escalate path', () => {
    it('decision BLOCK_AND_ESCALATE implies requiresEscalation', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const bound = bindGovernanceRuntime(orchResult);

      if (bound.governance.decision === 'BLOCK_AND_ESCALATE') {
        expect(bound.governance.requiresEscalation).toBe(true);
        expect(bound.governance.executionAllowed).toBe(false);
      }
    });
  });

  describe('no input mutation', () => {
    it('does not mutate orchestrator result', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const before = JSON.stringify(orchResult);
      bindGovernanceRuntime(orchResult);
      expect(JSON.stringify(orchResult)).toBe(before);
    });
  });

  describe('determinism', () => {
    it('same input => same output', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const a = bindGovernanceRuntime(orchResult);
      const b = bindGovernanceRuntime(orchResult);

      expect(a.governance.decision).toBe(b.governance.decision);
      expect(a.governance.executionAllowed).toBe(b.governance.executionAllowed);
      expect(a.governance.requiresOperatorReview).toBe(b.governance.requiresOperatorReview);
      expect(a.governance.requiresEscalation).toBe(b.governance.requiresEscalation);
    });
  });

  describe('result shape', () => {
    it('result includes all orchestrator fields plus governance', () => {
      const orchResult = orchestrateRepairEngine(makeInput());
      const bound = bindGovernanceRuntime(orchResult);

      expect(bound.input).toBe(orchResult.input);
      expect(bound.event).toBe(orchResult.event);
      expect(bound.intake).toBe(orchResult.intake);
      expect(bound.queueEntry).toBe(orchResult.queueEntry);
      expect(bound.strategy).toBe(orchResult.strategy);
      expect(bound.run).toBe(orchResult.run);
      expect(bound.state).toBe(orchResult.state);
      expect(bound.confidence).toBe(orchResult.confidence);
      expect(bound.verdict).toBe(orchResult.verdict);
      expect(bound.routing).toBe(orchResult.routing);
      expect(bound.status).toBe(orchResult.status);
      expect(bound.trace).toBe(orchResult.trace);
      expect(bound.governance.decision).toBeDefined();
      expect(bound.governance.executionAllowed).toBeDefined();
      expect(bound.governance.requiresOperatorReview).toBeDefined();
      expect(bound.governance.requiresEscalation).toBeDefined();
      expect(bound.governance.sourcePolicyEffect).toBeDefined();
      expect(bound.governance.sourcePolicyRule).toBeDefined();
    });
  });
});
