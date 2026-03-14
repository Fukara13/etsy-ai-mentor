/**
 * RE-13: Tests for mapGitHubRepairIntakeToOrchestratorInput.
 */

import { describe, it, expect } from 'vitest';
import { mapGitHubRepairIntakeToOrchestratorInput } from './map-github-repair-intake-to-orchestrator-input';
import type { GitHubRepairIntakeEvent } from './github-repair-intake-event';

function makeEvent(overrides: Partial<GitHubRepairIntakeEvent> = {}): GitHubRepairIntakeEvent {
  return Object.freeze({
    source: 'GITHUB_BACKBONE',
    trigger: 'UNKNOWN',
    externalEventId: 'deliv-1',
    eventKind: 'workflow_run',
    subjectId: 'run-123',
    summary: 'Workflow failed',
    riskFlag: false,
    reasons: [],
    metadata: {},
    ...overrides,
  });
}

describe('mapGitHubRepairIntakeToOrchestratorInput', () => {
  describe('workflow-style mapping', () => {
    it('GITHUB_WORKFLOW_FAILURE -> CI_FAILURE, source ci', () => {
      const input = makeEvent({ trigger: 'GITHUB_WORKFLOW_FAILURE' });
      const result = mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(result.event.type).toBe('CI_FAILURE');
      expect(result.event.source).toBe('ci');
      expect(result.event.subjectId).toBe('run-123');
      expect(result.event.summary).toBe('Workflow failed');
    });
  });

  describe('PR-style mapping', () => {
    it('GITHUB_PR_RISK_SIGNAL -> PR_UPDATED, source pull_request', () => {
      const input = makeEvent({ trigger: 'GITHUB_PR_RISK_SIGNAL', subjectId: 'pr-42' });
      const result = mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(result.event.type).toBe('PR_UPDATED');
      expect(result.event.source).toBe('pull_request');
      expect(result.event.subjectId).toBe('pr-42');
    });

    it('GITHUB_PR_REVIEW_REQUIRED -> PR_UPDATED', () => {
      const input = makeEvent({ trigger: 'GITHUB_PR_REVIEW_REQUIRED' });
      const result = mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(result.event.type).toBe('PR_UPDATED');
      expect(result.event.source).toBe('pull_request');
    });
  });

  describe('unknown fallback', () => {
    it('UNKNOWN -> CI_FAILURE fallback', () => {
      const input = makeEvent({ trigger: 'UNKNOWN' });
      const result = mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(result.event.type).toBe('CI_FAILURE');
      expect(result.event.source).toBe('ci');
    });
  });

  describe('determinism', () => {
    it('same input produces same output', () => {
      const input = makeEvent({ trigger: 'GITHUB_WORKFLOW_FAILURE' });
      const a = mapGitHubRepairIntakeToOrchestratorInput(input);
      const b = mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(a.event.type).toBe(b.event.type);
      expect(a.event.source).toBe(b.event.source);
      expect(a.event.subjectId).toBe(b.event.subjectId);
    });
  });

  describe('no input mutation', () => {
    it('does not mutate input', () => {
      const input = makeEvent();
      const before = JSON.stringify(input);
      mapGitHubRepairIntakeToOrchestratorInput(input);
      expect(JSON.stringify(input)).toBe(before);
    });
  });
});
