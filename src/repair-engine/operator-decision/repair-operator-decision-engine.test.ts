/**
 * RE-9: Operator decision engine tests.
 */

import { describe, it, expect } from 'vitest';
import { recordOperatorDecision } from './repair-operator-decision-engine';
import type { OperatorDecisionInput } from './operator-decision-input';

function makeInput(
  decisionAction: OperatorDecisionInput['decisionAction'],
  overrides?: Partial<OperatorDecisionInput>
): OperatorDecisionInput {
  return {
    decisionAction,
    decisionSummary: '  Some summary  ',
    operatorNote: '  Some note  ',
    ...overrides,
  };
}

describe('recordOperatorDecision', () => {
  it('records approve decision', () => {
    const result = recordOperatorDecision(makeInput('approve'));

    expect(result.recorded).toBe(true);
    expect(result.action).toBe('approve');
    expect(result.event.type).toBe('operator_decision_recorded');
    expect(result.event.summary).toBe('Some summary');
    expect(result.event.operatorNote).toBe('Some note');
  });

  it('records reject decision', () => {
    const result = recordOperatorDecision(makeInput('reject'));

    expect(result.recorded).toBe(true);
    expect(result.action).toBe('reject');
    expect(result.event.type).toBe('operator_decision_recorded');
  });

  it('records request_investigation decision', () => {
    const result = recordOperatorDecision(makeInput('request_investigation'));

    expect(result.recorded).toBe(true);
    expect(result.action).toBe('request_investigation');
    expect(result.event.type).toBe('operator_decision_recorded');
  });

  it('records request_escalation decision', () => {
    const result = recordOperatorDecision(makeInput('request_escalation'));

    expect(result.recorded).toBe(true);
    expect(result.action).toBe('request_escalation');
    expect(result.event.type).toBe('operator_decision_recorded');
  });

  it('trims summary and operatorNote', () => {
    const input = makeInput('approve', {
      decisionSummary: '  Summary with spaces  ',
      operatorNote: '  Note with spaces  ',
    });
    const result = recordOperatorDecision(input);

    expect(result.event.summary).toBe('Summary with spaces');
    expect(result.event.operatorNote).toBe('Note with spaces');
  });

  it('converts empty trimmed operatorNote to undefined', () => {
    const input = makeInput('approve', {
      operatorNote: '   ',
    });
    const result = recordOperatorDecision(input);

    expect(result.event.operatorNote).toBeUndefined();
  });

  it('throws on empty summary', () => {
    expect(() =>
      recordOperatorDecision(
        makeInput('approve', {
          decisionSummary: '',
        })
      )
    ).toThrow('Operator decision summary is required.');
  });

  it('throws on whitespace-only summary', () => {
    expect(() =>
      recordOperatorDecision(
        makeInput('approve', {
          decisionSummary: '   ',
        })
      )
    ).toThrow('Operator decision summary is required.');
  });

  it('throws on invalid action at runtime', () => {
    const input = {
      decisionAction: 'invalid',
      decisionSummary: 'summary',
    } as unknown as OperatorDecisionInput;

    expect(() => recordOperatorDecision(input)).toThrow(
      'Invalid operator decision action: invalid'
    );
  });
});

