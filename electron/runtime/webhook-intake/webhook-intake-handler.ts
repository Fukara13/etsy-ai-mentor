/**
 * RE-13: Webhook intake handler. Runs canonical pipeline for valid GitHub webhooks.
 * OC-3: Auto-refresh project-understanding artifacts before load when needed.
 * OC-4: Hero advisory run after context is ready; advisory only, no execution authority.
 */

import { normalizeGitHubEvent } from '../../../src/github/event-intake/normalize-github-event';
import { inspectPullRequest } from '../../../src/github/pr-inspection/inspect-pull-request';
import { derivePrIntelligence } from '../../../src/github/pr-intelligence/derive-pr-intelligence';
import { deriveGitHubRepairIntake } from '../../../src/github/intake-bridge/derive-github-repair-intake';
import { mapGitHubRepairIntakeToOrchestratorInput } from '../../../src/github/intake-bridge/map-github-repair-intake-to-orchestrator-input';
import { orchestrateRepairEngine } from '../../../src/repair-engine/orchestrator';
import { bindGovernanceRuntime } from '../../../src/repair-engine/governance-runtime';
import { loadProjectUnderstandingArtifacts } from '../project-understanding-loader';
import { bindProjectUnderstandingRuntime } from '../../../src/repair-engine/project-understanding-runtime';
import { parseWebhookRequest } from './parse-webhook-request';
import {
  refreshProjectUnderstanding,
  createDefaultFsAdapter,
  createDefaultProcessRunner,
} from '../project-understanding-auto-refresh';
import {
  runHeroesRuntime,
  createDefaultHeroAdvisoryRunner,
} from '../heroes-runtime';

const PROJECT_UNDERSTANDING_FRESHNESS_MS = 5 * 60 * 1000;

export type WebhookHandlerResponse = {
  statusCode: number;
  body?: string;
};

function safeExtractPullRequest(payload: Record<string, unknown>): Record<string, unknown> | null {
  const pr = payload.pull_request;
  if (!pr || typeof pr !== 'object') return null;
  return pr as Record<string, unknown>;
}

function safeExtractRepository(payload: Record<string, unknown>): { fullName: string } | null {
  const repo = payload.repository;
  if (!repo || typeof repo !== 'object') return null;
  const r = repo as Record<string, unknown>;
  const fullName = String(r.full_name ?? r.fullName ?? '').trim();
  if (!fullName) return null;
  return { fullName };
}

function buildInspectionInputFromPayload(payload: Record<string, unknown>): {
  pullRequest: {
    number: number;
    title: string;
    state: string;
    draft?: boolean;
    mergeable?: boolean | null;
    head: { ref: string };
    base: { ref: string };
  };
  repository: { fullName: string };
  files: never[];
} | null {
  const pr = safeExtractPullRequest(payload);
  const repo = safeExtractRepository(payload);
  if (!pr || !repo) return null;

  const head = pr.head as Record<string, unknown> | undefined;
  const base = pr.base as Record<string, unknown> | undefined;
  const num = typeof pr.number === 'number' ? pr.number : parseInt(String(pr.number ?? 0), 10) || 0;
  const title = typeof pr.title === 'string' ? pr.title : '';
  const state = typeof pr.state === 'string' ? pr.state : 'open';
  const draft = pr.draft === true;
  const mergeable = pr.mergeable === true ? true : pr.mergeable === false ? false : null;
  return {
    pullRequest: {
      number: num,
      title,
      state,
      draft,
      mergeable,
      head: { ref: typeof head?.ref === 'string' ? head.ref : '' },
      base: { ref: typeof base?.ref === 'string' ? base.ref : '' },
    },
    repository: repo,
    files: [],
  };
}

export async function webhookIntakeHandler(params: {
  method: string;
  headers: { get?: (name: string) => string | string[] | undefined };
  rawBody: string;
  cwd?: string;
}): Promise<WebhookHandlerResponse> {
  const parseResult = parseWebhookRequest({
    method: params.method,
    headers: params.headers,
    rawBody: params.rawBody,
  });

  if (!parseResult.ok) {
    return { statusCode: parseResult.statusCode, body: parseResult.reason };
  }

  try {
    const backboneEvent = normalizeGitHubEvent(parseResult.webhook);
    const payload = parseResult.webhook.payload as Record<string, unknown>;

    let inspectionResult: ReturnType<typeof inspectPullRequest> | undefined;
    let intelligenceResult: ReturnType<typeof derivePrIntelligence> | undefined;

    if (backboneEvent.category === 'PULL_REQUEST_UPDATE') {
      const inspInput = buildInspectionInputFromPayload(payload);
      if (inspInput) {
        inspectionResult = inspectPullRequest(inspInput);
        intelligenceResult = derivePrIntelligence({ inspection: inspectionResult });
      }
    }

    const intakeEvent = deriveGitHubRepairIntake({
      backboneEvent,
      inspectionResult,
      intelligenceResult,
    });

    const orchestratorInput = mapGitHubRepairIntakeToOrchestratorInput(intakeEvent);
    const orchResult = orchestrateRepairEngine(orchestratorInput);
    const govResult = bindGovernanceRuntime(orchResult);

    const cwd = params.cwd ?? process.cwd();
    const refreshResult = await refreshProjectUnderstanding({
      cwd,
      freshnessWindowMs: PROJECT_UNDERSTANDING_FRESHNESS_MS,
      eventCategory: backboneEvent.category,
      eventName: backboneEvent.eventKind,
      fsAdapter: createDefaultFsAdapter(),
      processRunner: createDefaultProcessRunner(),
    });
    if (refreshResult.status === 'failed') {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: 'project-understanding-refresh-failed',
          reason: refreshResult.reason,
          exitCode: refreshResult.exitCode,
        }),
      };
    }

    const changedFiles = inspectionResult?.changedFiles?.map((f) => f.path) ?? [];
    const artifactBundle = loadProjectUnderstandingArtifacts(cwd);

    const heroInput = {
      eventCategory: backboneEvent.category,
      eventKind: backboneEvent.eventKind,
      action: backboneEvent.action,
      summary: backboneEvent.summary,
      repositoryFullName: backboneEvent.repository?.fullName,
      subjectId: backboneEvent.subjectId,
      deliveryId: backboneEvent.deliveryId,
      changedFilePaths: changedFiles,
      hasArtifactBundle: Boolean(
        artifactBundle.architectureSummary ?? artifactBundle.dependencyGraph ?? artifactBundle.moduleMap
      ),
    };
    const heroResult = await runHeroesRuntime(heroInput, createDefaultHeroAdvisoryRunner());

    bindProjectUnderstandingRuntime({
      result: govResult,
      changedFiles,
      artifactBundle,
    });

    return { statusCode: 202 };
  } catch {
    return { statusCode: 500, body: 'Internal error' };
  }
}
