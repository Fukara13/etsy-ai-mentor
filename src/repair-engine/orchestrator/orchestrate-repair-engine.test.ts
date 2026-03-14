/**
 * RE-9: Deterministic tests for repair engine orchestrator.
 */

import { describe, it, expect } from 'vitest';
import { orchestrateRepairEngine } from './orchestrate-repair-engine';
import { runRepairEnginePipeline } from './run-repair-engine-pipeline';
import { resolveOrchestrationRoutingOutcome } from './resolve-orchestration-routing-outcome';
import { ORCHESTRATOR_STAGE_NAMES } from './orchestrator-stage-name';
import type { RepairEngineOrchestratorInput } from './repair-engine-orchestrator-input';
import type { RepairEngineEvent } from '../contracts/repair-engine-event';

function makeEvent(overrides?: Partial<RepairEngineEvent>): RepairEngineEvent {
  return Object.freeze({
    type: 'CI_FAILURE',
    source: 'ci',
    subjectId: 'run-123',
    summary: 'CI failed',
    attemptCount: 0,
    ...overrides,
  });
}

function makeInput(overrides?: Partial<RepairEngineOrchestratorInput>): RepairEngineOrchestratorInput {
  return Object.freeze({
    event: makeEvent(),
    ...overrides,
  });
}

describe('RE-9: orchestrateRepairEngine', () => {
  describe('exact stage order', () => {
    it('produces trace with stages in canonical order', () => {
      const input = makeInput();
      const result = orchestrateRepairEngine(input);

      expect(result.trace).toHaveLength(ORCHESTRATOR_STAGE_NAMES.length);

      for (let i = 0; i < ORCHESTRATOR_STAGE_NAMES.length; i++) {
        expect(result.trace[i].stage).toBe(ORCHESTRATOR_STAGE_NAMES[i]);
        expect(result.trace[i].order).toBe(i + 1);
      }
    });
  });

  describe('result shape integrity', () => {
    it('result contains all required fields', () => {
      const input = makeInput();
      const result = orchestrateRepairEngine(input);

      expect(result.input).toBe(input);
      expect(result.event).toBe(input.event);
      expect(result.intake).toBeDefined();
      expect(result.intake.accepted).toBe(true);
      expect(result.queueEntry).toBeDefined();
      expect(result.queueEntry.entryId).toBe('re:run-123:CI_FAILURE');
      expect(result.strategy).toBeDefined();
      expect(Array.isArray(result.strategy)).toBe(true);
      expect(result.run).toBeDefined();
      expect(result.state).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.verdict).toBeDefined();
      expect(result.routing).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.trace).toBeDefined();

      expect(result.routing).toMatchObject({
        requiresOperatorReview: expect.any(Boolean),
        isEscalated: expect.any(Boolean),
        isRoutable: expect.any(Boolean),
        finalChannel: expect.stringMatching(/^CONTINUE|OPERATOR_REVIEW|ESCALATION$/),
        reason: expect.any(String),
      });

      expect(['COMPLETED', 'COMPLETED_WITH_OPERATOR_REVIEW', 'COMPLETED_WITH_ESCALATION']).toContain(
        result.status
      );
    });
  });

  describe('determinism', () => {
    it('same input produces same output', () => {
      const input = makeInput();
      const a = orchestrateRepairEngine(input);
      const b = orchestrateRepairEngine(input);

      expect(a.queueEntry.entryId).toBe(b.queueEntry.entryId);
      expect(a.verdict.verdict).toBe(b.verdict.verdict);
      expect(a.routing.finalChannel).toBe(b.routing.finalChannel);
      expect(a.status).toBe(b.status);
      expect(a.trace.length).toBe(b.trace.length);
      for (let i = 0; i < a.trace.length; i++) {
        expect(a.trace[i].stage).toBe(b.trace[i].stage);
        expect(a.trace[i].order).toBe(b.trace[i].order);
      }
    });
  });

  describe('input immutability', () => {
    it('does not mutate input', () => {
      const event = makeEvent();
      const input = makeInput({ event });
      const before = JSON.stringify(input);
      orchestrateRepairEngine(input);
      const after = JSON.stringify(input);
      expect(after).toBe(before);
    });
  });

  describe('routing resolution', () => {
    it('routing outcome is stable for CI_FAILURE', () => {
      const result = orchestrateRepairEngine(makeInput());
      expect(result.routing.requiresOperatorReview).toBe(true);
      expect(result.routing.finalChannel).toBe('OPERATOR_REVIEW');
    });

    it('routing outcome for MANUAL_ANALYSIS_REQUESTED is OPERATOR_REVIEW', () => {
      const result = orchestrateRepairEngine(
        makeInput({ event: makeEvent({ type: 'MANUAL_ANALYSIS_REQUESTED', source: 'human' }) })
      );
      expect(result.routing.requiresOperatorReview).toBe(true);
      expect(result.routing.finalChannel).toBe('OPERATOR_REVIEW');
    });
  });

  describe('happy-path end-to-end', () => {
    it('orchestration completes with all stages', () => {
      const input = makeInput();
      const result = orchestrateRepairEngine(input);

      expect(result.intake.accepted).toBe(true);
      expect(result.intake.normalizedEvent).toBeDefined();
      expect(result.queueEntry.subjectId).toBe('run-123');
      expect(result.strategy.length).toBeGreaterThan(0);
      expect(result.run.runId).toMatch(/^run-/);
      expect(result.state.isLegalTransition).toBe(true);
      expect(result.confidence.value).toBeGreaterThanOrEqual(0);
      expect(result.confidence.value).toBeLessThanOrEqual(100);
      expect(result.verdict.verdict).toBeDefined();
      expect(result.trace[result.trace.length - 1].stage).toBe('ORCHESTRATION_COMPLETED');
    });
  });
});

describe('RE-9: resolveOrchestrationRoutingOutcome', () => {
  it('escalation yields ESCALATION channel', () => {
    const verdictResult = {
      verdict: 'escalate' as const,
      evaluation: {
        itemId: 'x',
        status: 'processing',
        lifecycleState: 'ANALYZING',
        strategyCount: 0,
        dominantStrategyType: null,
        riskLevel: 'high' as const,
        confidence: 0.5,
        confidenceLevel: 'medium' as const,
        reasonCodes: [],
        summary: 'Escalated',
      },
      recommendedStrategyType: null,
    };
    const operatorDecision = {
      repairItemId: 'x',
      verdict: 'escalate',
      summary: 'Escalated',
      riskLevel: 'high',
      confidence: 0.5,
      reasonCodes: [],
      actions: [
        {
          id: 'esc',
          label: 'Escalate',
          description: 'Escalate for human',
          actionType: 'escalate_to_human',
          recommended: true,
        },
      ],
    };
    const outcome = resolveOrchestrationRoutingOutcome(verdictResult, operatorDecision);
    expect(outcome.finalChannel).toBe('ESCALATION');
    expect(outcome.isEscalated).toBe(true);
  });

  it('operator review yields OPERATOR_REVIEW channel', () => {
    const verdictResult = {
      verdict: 'strategy_ready' as const,
      evaluation: {
        itemId: 'x',
        status: 'processing',
        lifecycleState: 'STRATEGY_READY',
        strategyCount: 1,
        dominantStrategyType: 'test_fix',
        riskLevel: 'low' as const,
        confidence: 0.85,
        confidenceLevel: 'high' as const,
        reasonCodes: [],
        summary: 'Ready',
      },
      recommendedStrategyType: 'test_fix' as const,
    };
    const operatorDecision = {
      repairItemId: 'x',
      verdict: 'strategy_ready',
      summary: 'Ready',
      riskLevel: 'low',
      confidence: 0.85,
      reasonCodes: [],
      actions: [],
    };
    const outcome = resolveOrchestrationRoutingOutcome(verdictResult, operatorDecision);
    expect(outcome.finalChannel).toBe('OPERATOR_REVIEW');
    expect(outcome.requiresOperatorReview).toBe(true);
  });
});

describe('RE-9: runRepairEnginePipeline', () => {
  it('runs pipeline and returns all outputs', () => {
    const event = makeEvent();
    const output = runRepairEnginePipeline(event);

    expect(output.intake.accepted).toBe(true);
    expect(output.queueEntry.entryId).toBe('re:run-123:CI_FAILURE');
    expect(output.strategy.length).toBeGreaterThan(0);
    expect(output.run).toBeDefined();
    expect(output.stateEvaluation).toBeDefined();
    expect(output.confidence).toBeDefined();
    expect(output.verdict).toBeDefined();
    expect(output.operatorDecision).toBeDefined();
  });
});
