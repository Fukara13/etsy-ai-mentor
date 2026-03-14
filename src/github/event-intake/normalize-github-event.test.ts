import { describe, expect, it } from 'vitest';
import { normalizeGitHubEvent } from './normalize-github-event';
import type { GitHubWebhookInput } from './github-webhook-input';

function input(
  eventKind: string,
  payload: Record<string, unknown>,
  deliveryId = 'delivery-123'
): GitHubWebhookInput {
  return Object.freeze({
    eventKind,
    deliveryId,
    payload: Object.freeze({ ...payload }),
  });
}

describe('normalizeGitHubEvent', () => {
  it('normalizes workflow_run failure to WORKFLOW_RUN_FAILURE', () => {
    const inp = input('workflow_run', {
      action: 'completed',
      workflow_run: {
        id: 12345,
        name: 'CI',
        conclusion: 'failure',
        head_branch: 'main',
      },
      repository: { full_name: 'owner/repo' },
    });

    const result = normalizeGitHubEvent(inp);

    expect(result.category).toBe('WORKFLOW_RUN_FAILURE');
    expect(result.eventKind).toBe('workflow_run');
    expect(result.action).toBe('completed');
    expect(result.subjectId).toBe('12345');
    expect(result.summary).toContain('failed');
    expect(result.repository?.fullName).toBe('owner/repo');
  });

  it('classifies workflow_run completed success as UNKNOWN', () => {
    const inp = input('workflow_run', {
      action: 'completed',
      workflow_run: { id: 1, conclusion: 'success', name: 'CI' },
    });

    const result = normalizeGitHubEvent(inp);

    expect(result.category).toBe('UNKNOWN');
    expect(result.subjectId).toBe('delivery-123');
  });

  it('classifies workflow_run requested as UNKNOWN', () => {
    const inp = input('workflow_run', {
      action: 'requested',
      workflow_run: { id: 1, name: 'CI' },
    });

    const result = normalizeGitHubEvent(inp);

    expect(result.category).toBe('UNKNOWN');
  });

  it('normalizes pull_request opened to PULL_REQUEST_UPDATE', () => {
    const inp = input('pull_request', {
      action: 'opened',
      pull_request: { number: 42, title: 'Fix bug' },
      repository: { full_name: 'owner/repo' },
    });

    const result = normalizeGitHubEvent(inp);

    expect(result.category).toBe('PULL_REQUEST_UPDATE');
    expect(result.action).toBe('opened');
    expect(result.subjectId).toBe('pr-42');
    expect(result.summary).toContain('Fix bug');
  });

  it('normalizes pull_request synchronize and reopened', () => {
    expect(
      normalizeGitHubEvent(
        input('pull_request', {
          action: 'synchronize',
          pull_request: { number: 1, title: 'A' },
        })
      ).category
    ).toBe('PULL_REQUEST_UPDATE');
    expect(
      normalizeGitHubEvent(
        input('pull_request', {
          action: 'reopened',
          pull_request: { number: 2, title: 'B' },
        })
      ).category
    ).toBe('PULL_REQUEST_UPDATE');
  });

  it('classifies pull_request closed as UNKNOWN', () => {
    const result = normalizeGitHubEvent(
      input('pull_request', {
        action: 'closed',
        pull_request: { number: 1, title: 'X' },
      })
    );
    expect(result.category).toBe('UNKNOWN');
  });

  it('normalizes push to PUSH', () => {
    const inp = input('push', {
      ref: 'refs/heads/main',
      after: 'abc123',
      head_commit: { message: 'feat: add feature' },
      repository: { full_name: 'org/repo', default_branch: 'main' },
    });

    const result = normalizeGitHubEvent(inp);

    expect(result.category).toBe('PUSH');
    expect(result.subjectId).toBe('abc123');
    expect(result.summary).toContain('feat');
  });

  it('classifies unknown event kind as UNKNOWN', () => {
    const result = normalizeGitHubEvent(
      input('issues', { action: 'opened', issue: { number: 1 } })
    );
    expect(result.category).toBe('UNKNOWN');
  });

  it('does not mutate input', () => {
    const inp = input('push', { ref: 'refs/heads/main', after: 'sha1' });
    const before = structuredClone(inp);
    normalizeGitHubEvent(inp);
    expect(inp).toEqual(before);
  });

  it('produces identical output for identical input (determinism)', () => {
    const inp = input('workflow_run', {
      action: 'completed',
      workflow_run: { id: 99, conclusion: 'failure', name: 'Test' },
    });
    const a = normalizeGitHubEvent(inp);
    const b = normalizeGitHubEvent(inp);
    expect(a).toEqual(b);
    expect(a.category).toBe(b.category);
    expect(a.subjectId).toBe(b.subjectId);
  });

  it('handles eventKind case-insensitively', () => {
    const payload = {
      action: 'completed',
      workflow_run: { id: 1, conclusion: 'failure', name: 'CI' },
    };
    expect(normalizeGitHubEvent(input('WORKFLOW_RUN', payload)).category).toBe(
      'WORKFLOW_RUN_FAILURE'
    );
  });

  it('uses deliveryId when subjectId cannot be derived', () => {
    const result = normalizeGitHubEvent(
      input('workflow_run', {
        action: 'completed',
        workflow_run: { conclusion: 'failure', name: 'CI' },
      })
    );
    expect(result.subjectId).toBe('delivery-123');
  });

  it('handles push without head_commit', () => {
    const result = normalizeGitHubEvent(
      input('push', { ref: 'refs/heads/main', after: 'xyz' })
    );
    expect(result.category).toBe('PUSH');
    expect(result.summary).toContain('refs/heads/main');
  });
});
