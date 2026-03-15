/**
 * RE-13: Tests for webhook intake handler.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  webhookIntakeHandler,
  shouldAttachAdvisoryToWebhookResponse,
} from './webhook-intake-handler';

vi.mock('../project-understanding-auto-refresh', () => ({
  refreshProjectUnderstanding: vi.fn().mockResolvedValue({
    status: 'skipped',
    reason: 'fresh-enough',
    artifactPaths: [],
    commandsRun: [],
    startedAt: '',
    finishedAt: '',
    durationMs: 0,
  }),
  createDefaultFsAdapter: vi.fn(),
  createDefaultProcessRunner: vi.fn(),
}));

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
  it('valid workflow_run returns 202', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'workflow_run' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
  });

  it('valid pull_request returns 202', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'pull_request' }),
      rawBody: JSON.stringify(pullRequestPayload),
    });
    expect(res.statusCode).toBe(202);
  });

  it('invalid JSON returns 400', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers(),
      rawBody: 'not json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).toContain('Invalid');
  });

  it('unsupported method returns 405', async () => {
    const res = await webhookIntakeHandler({
      method: 'GET',
      headers: headers(),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(405);
  });

  it('missing X-GitHub-Event returns 400', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': '' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(400);
  });

  it('empty body returns 400', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers(),
      rawBody: '',
    });
    expect(res.statusCode).toBe(400);
  });

  it('no crash on malformed input', async () => {
    await expect(
      webhookIntakeHandler({
        method: 'POST',
        headers: headers(),
        rawBody: '{{{',
      })
    ).resolves.toBeDefined();
  });

  it('pipeline invoked for valid event', async () => {
    const res = await webhookIntakeHandler({
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
      const res = await webhookIntakeHandler({
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

describe('OC-6: shouldAttachAdvisoryToWebhookResponse', () => {
  it('returns true only when header value is "1"', () => {
    expect(
      shouldAttachAdvisoryToWebhookResponse(headers({ 'x-ai-devos-advisory': '1' }))
    ).toBe(true);
    expect(
      shouldAttachAdvisoryToWebhookResponse(headers({ 'x-ai-devos-advisory': ' 1 ' }))
    ).toBe(true);
  });

  it('returns false when header is absent', () => {
    expect(shouldAttachAdvisoryToWebhookResponse(headers())).toBe(false);
  });

  it('returns false for non-trigger values', () => {
    expect(
      shouldAttachAdvisoryToWebhookResponse(headers({ 'x-ai-devos-advisory': '0' }))
    ).toBe(false);
    expect(
      shouldAttachAdvisoryToWebhookResponse(headers({ 'x-ai-devos-advisory': '' }))
    ).toBe(false);
    expect(
      shouldAttachAdvisoryToWebhookResponse(headers({ 'x-ai-devos-advisory': 'true' }))
    ).toBe(false);
  });
});

describe('OC-6: optional advisory attachment', () => {
  it('when X-AI-DEVOS-Advisory: 1, response includes operatorAdvisoryProjection', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({
        'x-github-event': 'workflow_run',
        'x-ai-devos-advisory': '1',
      }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
    expect(res.body).toBeDefined();
    const parsed = JSON.parse(res.body!) as { operatorAdvisoryProjection?: unknown };
    expect(parsed.operatorAdvisoryProjection).toBeDefined();
    const proj = parsed.operatorAdvisoryProjection as Record<string, unknown>;
    expect(proj.source).toBe('hero-runtime');
    expect(proj.status).toBeDefined();
    expect(Array.isArray(proj.advisorySummaries)).toBe(true);
    expect(proj.selectedHeroIds).toBeUndefined();
    expect(proj.execute).toBeUndefined();
    expect(proj.approve).toBeUndefined();
  });

  it('when header absent, response body is unchanged (no advisory)', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({ 'x-github-event': 'workflow_run' }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
    expect(res.body).toBeUndefined();
  });

  it('when X-AI-DEVOS-Advisory is 0, advisory is not attached', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({
        'x-github-event': 'workflow_run',
        'x-ai-devos-advisory': '0',
      }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
    expect(res.body).toBeUndefined();
  });

  it('when X-AI-DEVOS-Advisory is empty string, advisory is not attached', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({
        'x-github-event': 'workflow_run',
        'x-ai-devos-advisory': '',
      }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    expect(res.statusCode).toBe(202);
    expect(res.body).toBeUndefined();
  });

  it('projection in response has same shape as runtime mapping', async () => {
    const res = await webhookIntakeHandler({
      method: 'POST',
      headers: headers({
        'x-github-event': 'workflow_run',
        'x-ai-devos-advisory': '1',
      }),
      rawBody: JSON.stringify(workflowRunPayload),
    });
    const parsed = JSON.parse(res.body!) as { operatorAdvisoryProjection?: Record<string, unknown> };
    const proj = parsed.operatorAdvisoryProjection;
    expect(proj).toBeDefined();
    expect(proj!.source).toBe('hero-runtime');
    expect(['completed', 'skipped', 'partial', 'failed']).toContain(proj!.status);
    expect(Array.isArray(proj!.advisorySummaries)).toBe(true);
    if ((proj!.advisorySummaries as unknown[]).length > 0) {
      const item = (proj!.advisorySummaries as Record<string, unknown>[])[0];
      expect(typeof item.summary).toBe('string');
      expect(typeof item.rationaleExcerpt).toBe('string');
      expect(item.heroId).toBeUndefined();
    }
  });
});

