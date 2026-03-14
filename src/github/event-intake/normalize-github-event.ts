/**
 * GH-6: Pure normalizer from GitHub webhook payload to backbone event.
 * Deterministic, no I/O, no input mutation.
 */

import type { GitHubBackboneEvent } from './github-backbone-event';
import type { GitHubEventCategory } from './github-event-category';
import type { GitHubWebhookInput } from './github-webhook-input';

const SUPPORTED_PR_ACTIONS = ['opened', 'synchronize', 'reopened'] as const;

function safeString(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function safeNum(v: unknown): number | undefined {
  if (v == null) return undefined;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? undefined : n;
}

function getRepo(p: Record<string, unknown>): GitHubBackboneEvent['repository'] | undefined {
  const repo = p.repository;
  if (!repo || typeof repo !== 'object') return undefined;
  const r = repo as Record<string, unknown>;
  const fullName = safeString(r.full_name ?? r.name ?? '');
  if (!fullName) return undefined;
  const defaultBranch = safeString(
    (r.default_branch as unknown) ?? (r.defaultBranch as unknown)
  ).trim();
  return { fullName: fullName.trim(), defaultBranch: defaultBranch || undefined };
}

function buildEvent(
  category: GitHubEventCategory,
  input: GitHubWebhookInput,
  subjectId: string,
  summary: string,
  action?: string
): GitHubBackboneEvent {
  const repo = getRepo(input.payload as Record<string, unknown>);
  return Object.freeze({
    category,
    deliveryId: input.deliveryId,
    eventKind: input.eventKind,
    action: action || undefined,
    repository: repo,
    subjectId,
    summary,
    metadata: Object.freeze({ ...input.payload }),
  });
}

/**
 * Normalizes GitHub webhook input to backbone event.
 * Unknown/unsupported events → category UNKNOWN.
 */
export function normalizeGitHubEvent(input: GitHubWebhookInput): GitHubBackboneEvent {
  const ek = input.eventKind?.toLowerCase().trim() || '';
  const p = input.payload as Record<string, unknown>;
  const action = safeString(p.action).toLowerCase().trim();

  if (ek === 'workflow_run') {
    const wr = p.workflow_run;
    if (wr && typeof wr === 'object') {
      const w = wr as Record<string, unknown>;
      const conclusion = safeString(w.conclusion).toLowerCase();
      if (action === 'completed' && conclusion === 'failure') {
        const runId = safeNum(w.id) ?? safeString(w.id);
        const name = safeString(w.name).trim() || 'workflow';
        const headBranch = safeString(w.head_branch ?? w.headBranch).trim();
        const subjectId = String(runId || input.deliveryId);
        const summary = `Workflow run failed: ${name}${headBranch ? ` (${headBranch})` : ''}`;
        return buildEvent('WORKFLOW_RUN_FAILURE', input, subjectId, summary, action);
      }
    }
    return buildEvent(
      'UNKNOWN',
      input,
      input.deliveryId,
      `Unsupported workflow_run: action=${action}`,
      action
    );
  }

  if (ek === 'pull_request') {
    if (SUPPORTED_PR_ACTIONS.includes(action as (typeof SUPPORTED_PR_ACTIONS)[number])) {
      const pr = p.pull_request;
      if (pr && typeof pr === 'object') {
        const prObj = pr as Record<string, unknown>;
        const number = safeNum(prObj.number) ?? 0;
        const title = safeString(prObj.title).trim() || `PR #${number}`;
        const subjectId = number > 0 ? `pr-${number}` : input.deliveryId;
        const summary = `Pull request ${action}: ${title}`;
        return buildEvent('PULL_REQUEST_UPDATE', input, subjectId, summary, action);
      }
    }
    return buildEvent(
      'UNKNOWN',
      input,
      input.deliveryId,
      `Unsupported pull_request: action=${action}`,
      action
    );
  }

  if (ek === 'push') {
    const after = safeString(p.after).trim();
    const ref = safeString(p.ref).trim();
    const headCommit = p.head_commit ?? p.headCommit;
    let summary = `Push to ${ref || 'unknown ref'}`;
    if (headCommit && typeof headCommit === 'object') {
      const hc = headCommit as Record<string, unknown>;
      const msg = safeString(hc.message).trim();
      if (msg) summary = msg.split('\n')[0].slice(0, 120);
    }
    const subjectId = after || input.deliveryId;
    return buildEvent('PUSH', input, subjectId, summary);
  }

  return buildEvent(
    'UNKNOWN',
    input,
    input.deliveryId,
    `Unsupported event: ${ek || 'empty'}`
  );
}
