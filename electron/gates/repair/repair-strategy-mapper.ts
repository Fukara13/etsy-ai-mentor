/**
 * Gate-S30: Repair Strategy mapper — Pure mapping from analysis to strategy output.
 */

import type {
  RepairStrategyOutput,
  RepairStrategyType,
  RepairStrategyConfidence,
} from './repair-strategy.types';

export type MapRepairStrategyInput = {
  readonly analysis?: {
    readonly primaryCategory?: string;
    readonly confidence?: 'low' | 'medium' | 'high';
    readonly hypothesis?: string;
    readonly suggestedFiles?: readonly string[];
    readonly fallback?: boolean;
  };
};

function categoryToStrategyType(cat: string | undefined): RepairStrategyType {
  if (!cat || typeof cat !== 'string') return 'unknown';
  const c = cat.trim().toLowerCase();
  switch (c) {
    case 'infra_retry':
      return 'retry_ci';
    case 'dependency':
      return 'dependency_fix';
    case 'flaky_test':
      return 'test_flaky';
    case 'config':
      return 'configuration_issue';
    case 'manual':
      return 'human_investigation';
    default:
      return 'unknown';
  }
}

function toConfidence(c: string | undefined, fallback: boolean): RepairStrategyConfidence {
  if (fallback) return 'low';
  if (c === 'low' || c === 'medium' || c === 'high') return c;
  return 'low';
}

function getRecommendedActions(st: RepairStrategyType): readonly string[] {
  switch (st) {
    case 'retry_ci':
      return ['re-run CI with same inputs', 'inspect transient failure signals'];
    case 'dependency_fix':
      return ['inspect package manifest and lockfile', 'verify dependency resolution'];
    case 'test_flaky':
      return ['inspect flaky test stability', 'review nondeterministic behavior'];
    case 'configuration_issue':
      return ['inspect configuration files', 'compare CI/runtime configuration'];
    case 'human_investigation':
      return ['escalate to operator review', 'inspect logs manually'];
    case 'unknown':
      return ['collect more diagnostic evidence', 'escalate for manual review'];
    default: {
      const _: never = st;
      return ['escalate for manual review'];
    }
  }
}

function buildRationale(
  hypothesis: string | undefined,
  strategyType: RepairStrategyType,
  fallback: boolean
): string {
  if (fallback) {
    return 'Fallback strategy selected; insufficient analysis data.';
  }
  const hyp = hypothesis?.trim();
  if (hyp && hyp.length > 0) {
    return `Strategy based on: ${hyp}`;
  }
  const reasons: Record<RepairStrategyType, string> = {
    retry_ci: 'Infrastructure or transient failure indicated; retry CI.',
    dependency_fix: 'Dependency-related failure indicated.',
    test_flaky: 'Flaky or nondeterministic test behavior indicated.',
    configuration_issue: 'Configuration-related failure indicated.',
    human_investigation: 'Manual investigation required.',
    unknown: 'Unknown failure category; manual review required.',
  };
  return reasons[strategyType];
}

export function mapRepairStrategy(input: MapRepairStrategyInput): RepairStrategyOutput {
  const analysis = input.analysis;
  const fallback = analysis?.fallback ?? true;
  const strategyType = categoryToStrategyType(analysis?.primaryCategory);
  const confidence = toConfidence(analysis?.confidence, fallback);
  const requiresHuman = strategyType === 'human_investigation' || strategyType === 'unknown';

  return {
    strategyType,
    confidence,
    recommendedActions: getRecommendedActions(strategyType),
    targetFiles: analysis?.suggestedFiles?.length ? [...analysis.suggestedFiles] : undefined,
    rationale: buildRationale(analysis?.hypothesis, strategyType, fallback),
    requiresHuman,
    safeToAutoExecute: false,
  };
}
