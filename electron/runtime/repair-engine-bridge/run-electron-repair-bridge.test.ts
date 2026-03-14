/**
 * RE-10: Deterministic tests for Electron repair-engine bridge.
 */

import { describe, it, expect } from 'vitest';
import { mapElectronInputToOrchestratorInput } from './map-electron-input-to-orchestrator-input';
import { mapOrchestratorResultToElectronResult } from './map-orchestrator-result-to-electron-result';
import { runElectronRepairBridge } from './run-electron-repair-bridge';
import { runBoundedRepairLoop } from '../../gates/repair/repair-loop-orchestrator';
import type { ElectronRepairBridgeInput } from './map-electron-input-to-orchestrator-input';
import { orchestrateRepairEngine } from '../../../src/repair-engine/orchestrator';

function makeInput(overrides?: Partial<ElectronRepairBridgeInput>): ElectronRepairBridgeInput {
  return Object.freeze({
    initialState: 'ANALYZE',
    retryCount: 0,
    maxRetries: 3,
    maxSteps: 20,
    sessionId: 'test-session-1',
    ...overrides,
  });
}

describe('RE-10: mapElectronInputToOrchestratorInput', () => {
  it('maps sessionId to event subjectId', () => {
    const input = makeInput({ sessionId: 'my-run-123' });
    const result = mapElectronInputToOrchestratorInput(input);
    expect(result.event.subjectId).toBe('my-run-123');
    expect(result.event.type).toBe('CI_FAILURE');
    expect(result.event.source).toBe('ci');
  });

  it('maps retryCount to event attemptCount', () => {
    const input = makeInput({ retryCount: 2 });
    const result = mapElectronInputToOrchestratorInput(input);
    expect(result.event.attemptCount).toBe(2);
  });

  it('does not mutate source input', () => {
    const input = makeInput();
    const before = JSON.stringify(input);
    mapElectronInputToOrchestratorInput(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('uses deterministic fallback when sessionId omitted', () => {
    const input = makeInput({ sessionId: undefined });
    const result = mapElectronInputToOrchestratorInput(input);
    expect(result.event.subjectId).toBe('legacy-bridge-default');
  });

  it('uses fallback when sessionId is empty string (treated as missing)', () => {
    const input = makeInput({ sessionId: '' });
    const result = mapElectronInputToOrchestratorInput(input);
    expect(result.event.subjectId).toBe('legacy-bridge-default');
  });
});

describe('RE-10: mapOrchestratorResultToElectronResult', () => {
  it('produces outcome with correct shape', () => {
    const orchInput = mapElectronInputToOrchestratorInput(makeInput());
    const orchResult = orchestrateRepairEngine(orchInput);
    const result = mapOrchestratorResultToElectronResult(orchResult);

    expect(result.outcome).toBeDefined();
    expect(result.outcome.sessionId).toBe('test-session-1');
    expect(result.outcome.initialState).toBe('ANALYZE');
    expect(result.outcome.visitedPath).toContain('ANALYZE');
    expect(result.handoff).toBeDefined();
    expect(result.status).toBeDefined();
    expect(result.requiresOperatorReview).toBeDefined();
    expect(result.isEscalated).toBeDefined();
    expect(result.routingSummary).toBeDefined();
    expect(result.traceStageCount).toBe(10);
  });

  it('preserves operator review and escalation signals', () => {
    const orchInput = mapElectronInputToOrchestratorInput(makeInput());
    const orchResult = orchestrateRepairEngine(orchInput);
    const result = mapOrchestratorResultToElectronResult(orchResult);

    expect(typeof result.requiresOperatorReview).toBe('boolean');
    expect(typeof result.isEscalated).toBe('boolean');
    expect(result.routingSummary).toMatch(/OPERATOR_REVIEW|ESCALATION|CONTINUE/);
  });
});

describe('RE-10: runElectronRepairBridge', () => {
  it('calls canonical orchestrator path', () => {
    const input = makeInput();
    const result = runElectronRepairBridge(input);

    expect(result.outcome).toBeDefined();
    expect(result.handoff).toBeDefined();
    expect(result.outcome.lastActor).toBe('RepairEngineOrchestrator');
    expect(result.traceStageCount).toBe(10);
  });

  it('same input produces same output', () => {
    const input = makeInput();
    const a = runElectronRepairBridge(input);
    const b = runElectronRepairBridge(input);

    expect(a.outcome.sessionId).toBe(b.outcome.sessionId);
    expect(a.outcome.finalState).toBe(b.outcome.finalState);
    expect(a.status).toBe(b.status);
    expect(a.routingSummary).toBe(b.routingSummary);
  });

  it('does not mutate input', () => {
    const input = makeInput();
    const before = JSON.stringify(input);
    runElectronRepairBridge(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('output mapping correctness: outcome matches handoff', () => {
    const result = runElectronRepairBridge(makeInput());
    expect(result.handoff.requiresHuman).toBe(result.outcome.requiresHuman);
    expect(result.handoff.finalState).toBe(result.outcome.finalState);
  });

  it('legacy wrapper delegates to bridge', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 20,
      sessionId: 'legacy-delegate-test',
    });
    expect(outcome.lastActor).toBe('RepairEngineOrchestrator');
    expect(outcome.sessionId).toBe('legacy-delegate-test');
  });
});
