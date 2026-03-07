/**
 * Gate-S28: Deterministic telemetry projection — Pure mapping tests.
 */

import { describe, it, expect } from 'vitest';
import { mapRepairTelemetryEvent } from './repair-telemetry-mapper';
import type { RepairRunVerdict } from './repair-run-verdict';
import type { RepairRunOutcome } from './repair-run-outcome';

function verdict(partial: Partial<RepairRunVerdict>): RepairRunVerdict {
  return {
    status: 'halted',
    reasonCode: 'RUN_HALTED_BLOCKED',
    requiresHuman: false,
    safeToRetry: true,
    safeToClose: false,
    operatorMessage: 'Repair run halted.',
    ...partial,
  };
}

function outcome(partial: Partial<RepairRunOutcome>): RepairRunOutcome {
  return {
    sessionId: 'repair_123',
    initialState: 'ANALYZE',
    finalState: 'HUMAN',
    totalSteps: 5,
    visitedPath: [],
    halted: true,
    terminal: false,
    requiresHuman: false,
    exhaustionReached: false,
    terminationReason: 'halted',
    lastTransitionEvent: null,
    lastActor: 'None',
    startedAt: '',
    endedAt: '',
    ...partial,
  };
}

describe('Gate-S28: resolved verdict maps to status=resolved, severity=info', () => {
  it('requiresHuman=false, severity=info', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({
        status: 'resolved',
        reasonCode: 'RUN_RESOLVED',
        requiresHuman: false,
      }),
    });
    expect(e.status).toBe('resolved');
    expect(e.severity).toBe('info');
    expect(e.requiresHuman).toBe(false);
  });
});

describe('Gate-S28: requires_human verdict maps to severity=warning', () => {
  it('status=requires_human, severity=warning', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({
        status: 'requires_human',
        reasonCode: 'RUN_EXHAUSTED',
        requiresHuman: true,
      }),
    });
    expect(e.status).toBe('requires_human');
    expect(e.severity).toBe('warning');
    expect(e.requiresHuman).toBe(true);
  });
});

describe('Gate-S28: halted verdict maps to severity=warning', () => {
  it('status=halted, severity=warning', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({ status: 'halted', reasonCode: 'RUN_MAX_STEPS_REACHED' }),
    });
    expect(e.status).toBe('halted');
    expect(e.severity).toBe('warning');
  });
});

describe('Gate-S28: blocked verdict maps to severity=critical', () => {
  it('status=blocked, severity=critical', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({
        status: 'blocked',
        reasonCode: 'RUN_POLICY_BLOCKED',
      }),
    });
    expect(e.status).toBe('blocked');
    expect(e.severity).toBe('critical');
  });
});

describe('Gate-S28: outcome metadata is included when provided', () => {
  it('totalSteps and sessionId from outcome', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({}),
      outcome: outcome({
        sessionId: 'session-xyz',
        totalSteps: 7,
        finalState: 'EXHAUSTED',
      }),
    });
    expect(e.totalSteps).toBe(7);
    expect(e.metadata.sessionId).toBe('session-xyz');
    expect(e.finalState).toBe('EXHAUSTED');
  });
});

describe('Gate-S28: mapper remains deterministic', () => {
  it('same input returns deeply equal output', () => {
    const params = {
      verdict: verdict({ status: 'resolved' }),
      outcome: outcome({ sessionId: 'abc', totalSteps: 2 }),
    };
    const a = mapRepairTelemetryEvent(params);
    const b = mapRepairTelemetryEvent(params);
    expect(a).toEqual(b);
  });
});

describe('Gate-S28: fixed fields are always present', () => {
  it('eventName, metadata.source, metadata.projectionVersion', () => {
    const e = mapRepairTelemetryEvent({ verdict: verdict({}) });
    expect(e.eventName).toBe('repair.run.evaluated');
    expect(e.metadata.source).toBe('repair-verdict-layer');
    expect(e.metadata.projectionVersion).toBe('s28-v1');
  });
});

describe('Gate-S28: no outcome provided', () => {
  it('mapper succeeds, optional fields undefined', () => {
    const e = mapRepairTelemetryEvent({
      verdict: verdict({ status: 'resolved', requiresHuman: false }),
    });
    expect(e.totalSteps).toBeUndefined();
    expect(e.metadata.sessionId).toBeUndefined();
    expect(e.finalState).toBe('HUMAN');
    expect(e.requiresHuman).toBe(false);
  });
});
