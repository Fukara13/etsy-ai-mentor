/**
 * Gate-S27: GitHub projection — Pure mapping tests.
 */

import { describe, it, expect } from 'vitest';
import { mapGitHubProjection } from './github-projection-mapper';
import type { RepairExternalProjection } from './external-boundary.types';

function projection(partial: Partial<RepairExternalProjection>): RepairExternalProjection {
  return {
    projectionTarget: 'operator',
    projectionStatus: 'halted',
    projectionMessage: 'Repair run halted.',
    recommendedAction: 'blocked_no_action',
    requiresHuman: false,
    safeToRetry: true,
    safeToClose: false,
    finalState: 'COACH',
    reasonCode: 'RUN_HALTED_BLOCKED',
    summary: 'Repair halted.',
    ...partial,
  };
}

describe('Gate-S27: maps resolved projection into success GitHub projection', () => {
  it('surface=pr_comment, status=resolved, recommendedConclusion=success', () => {
    const g = mapGitHubProjection(
      projection({
        projectionStatus: 'resolved',
        requiresHuman: false,
        safeToClose: true,
        summary: 'Repair resolved.',
        projectionMessage: 'Repair run resolved successfully.',
      })
    );
    expect(g.surface).toBe('pr_comment');
    expect(g.status).toBe('resolved');
    expect(g.recommendedConclusion).toBe('success');
    expect(g.title).toBe('Repair resolved — safe to close');
    expect(g.requiresHuman).toBe(false);
    expect(g.safeToClose).toBe(true);
  });
});

describe('Gate-S27: maps requires_human projection into action_required GitHub projection', () => {
  it('status=requires_human, recommendedConclusion=action_required', () => {
    const g = mapGitHubProjection(
      projection({
        projectionStatus: 'requires_human',
        requiresHuman: true,
      })
    );
    expect(g.status).toBe('requires_human');
    expect(g.recommendedConclusion).toBe('action_required');
    expect(g.title).toBe('Manual review required');
    expect(g.requiresHuman).toBe(true);
  });
});

describe('Gate-S27: maps halted projection into neutral GitHub projection', () => {
  it('status=halted, recommendedConclusion=neutral', () => {
    const g = mapGitHubProjection(
      projection({ projectionStatus: 'halted', summary: 'Repair halted.' })
    );
    expect(g.status).toBe('halted');
    expect(g.recommendedConclusion).toBe('neutral');
    expect(g.title).toBe('Repair halted');
  });
});

describe('Gate-S27: maps blocked projection into failure GitHub projection', () => {
  it('status=blocked, recommendedConclusion=failure', () => {
    const g = mapGitHubProjection(
      projection({
        projectionStatus: 'blocked',
        summary: 'Repair blocked by policy.',
      })
    );
    expect(g.status).toBe('blocked');
    expect(g.recommendedConclusion).toBe('failure');
    expect(g.title).toBe('Repair blocked by policy');
  });
});

describe('Gate-S27: preserves metadata when sessionId and totalSteps are present', () => {
  it('metadata.sessionId and metadata.totalSteps copied', () => {
    const g = mapGitHubProjection(
      projection({
        metadata: { sessionId: 'repair_123', totalSteps: 5 },
      })
    );
    expect(g.metadata?.sessionId).toBe('repair_123');
    expect(g.metadata?.totalSteps).toBe(5);
  });
});

describe('Gate-S27: body contains deterministic core lines', () => {
  it('body includes all required sections', () => {
    const g = mapGitHubProjection(
      projection({
        projectionStatus: 'resolved',
        summary: 'Repair resolved.',
        projectionMessage: 'Repair run resolved successfully.',
      })
    );
    const b = g.body;
    expect(b).toContain('Repair resolved — safe to close');
    expect(b).toContain('Message:');
    expect(b).toContain('Summary:');
    expect(b).toContain('Recommended action:');
    expect(b).toContain('Final state:');
    expect(b).toContain('Reason code:');
    expect(b).toContain('Requires human:');
    expect(b).toContain('Safe to retry:');
    expect(b).toContain('Safe to close:');
    expect(b).toContain('Human authority remains required where applicable.');
  });
});

describe('Gate-S27: summary prefers input.summary over projectionMessage', () => {
  it('uses input.summary when both provided', () => {
    const g = mapGitHubProjection(
      projection({
        summary: 'Preferred summary',
        projectionMessage: 'Alternative message',
      })
    );
    expect(g.summary).toBe('Preferred summary');
    expect(g.body).toContain('Summary: Preferred summary');
  });
});

describe('Gate-S27: summary falls back to projectionMessage when summary is empty', () => {
  it('uses projectionMessage when summary is empty', () => {
    const g = mapGitHubProjection(
      projection({
        summary: '',
        projectionMessage: 'Fallback message text',
      })
    );
    expect(g.summary).toBe('Fallback message text');
  });
});

describe('Gate-S27: unsupported projectionStatus throws clear error', () => {
  it('throws with exact prefix', () => {
    expect(() =>
      mapGitHubProjection(
        projection({
          projectionStatus: 'invalid_status' as RepairExternalProjection['projectionStatus'],
        })
      )
    ).toThrow('Unsupported projectionStatus for GitHub projection:');
  });
});
