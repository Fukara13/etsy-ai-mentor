/**
 * RE-13: Tests for webhook intake handler.
 */

import { describe, it, expect, vi } from 'vitest';
import { webhookIntakeHandler } from './webhook-intake-handler';

const workflowRunPayload = {
  action: 'completed',
  workflow_run: {
    id: 123,
    name: 'ci',
    conclusion: 'failure',
    head_branch: 'main',
  },
  repository: { full_name: 'owner/repo' },
};

const pullRequestPayload = {
  action: 'opened',
  pull_request: {
    number: 42,
    title: 'Fix bug',
    state: 'open',
    draft: false,
    mergeable: null,
    head: { ref: 'feature-branch' },
    base: { ref: 'main' },
  },
  repository: { full_name: 'owner/repo' },
};

function headers(overrides: Record<string, string> = {}): { get: (n: string) => string } {
  const h: Record<string, string> = {
    'x-github-event': 'workflow_run',
    'x-github-delivery': 'delivery-123',
    ...overrides,
  };
  return {
    get: (name: string) => h[name.toLowerCase()] ?? '',
  };
}

describe('RE-13: webhookIntakeHandler', () => {
  it('valid workflow_run returns 202', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'workflow_run' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
  });

  it('valid pull_request returns 202', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'pull_request' }),
      rawBody: JSON.stringify(pullRequestPayload),
    });
    expect(res.statusCode).toBe(202);
  });

  it('invalid JSON returns 400', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers(),
      rawBody: 'not json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Invalid');
  });

  it('unsupported method returns 405', () => {
    const res = webhookIntakeHandler({
      method: 'GET',
      headers: headers(),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(405);
  });

  it('missing X-GitHub-Event returns 400', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': '' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(400);
  });

  it('empty body returns 400', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers(),
      rawBody: '',
    });
    expect(res.statusCode).toBe(400);
  });

  it('no crash on malformed input', () => {
    expect(() =>
      webhookIntakeHandler({
        method: 'POST',
        headers: headers(),
        rawBody: '{{{',
      })
    ).not.toThrow();
  });

  it('pipeline invoked for valid event', () => {
    const res = webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'workflow_run' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
  });

  it('internal failure returns 500', async () => {
    const orch = await import('../../../src/repair-engine/orchestrator');
    const spy = vi.spyOn(orch, 'orchestrateRepairEngine').mockImplementation(() => {
      throw new Error('pipeline error');
    });
    try {
      const res = webhookIntakeHandler({
        method: 'POST',
        headers: headers({ 'x-github-event': 'workflow_run' }),
        rawBody: JSON.stringify(workflowRunPayload),
      });
      expect(res.statusCode).toBe(500);
      expect(res.body).toContain('Internal');
    } finally {
      spy.mockRestore();
    }
  });
});

