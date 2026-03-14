/**
 * GH-8: Pure PR intelligence derivation. No I/O, no mutation.
 */

import type { PrFileChange } from '../pr-inspection';
import type { PrReviewComplexity } from './pr-review-complexity';
import type { PrIntelligenceInput } from './pr-intelligence-input';
import type { PrIntelligenceResult } from './pr-intelligence-result';
import type { PrRiskSignals } from './pr-risk-signal';
import type { PrSizeBand } from './pr-size-band';

const DEP_FILES = ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];
const CORE_PREFIXES = ['src/repair-engine/', 'src/governance/', 'src/shared/'];

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').trim();
}

function pathEndsWith(path: string, name: string): boolean {
  return path === name || path.endsWith('/' + name);
}

function touchesDependencies(path: string): boolean {
  const n = normalizePath(path);
  return DEP_FILES.some((f) => pathEndsWith(n, f));
}

function touchesConfig(path: string): boolean {
  const n = normalizePath(path);
  if (
    pathEndsWith(n, 'tsconfig.json') ||
    n.match(/vitest\.config\.(\w+)?(\.(ts|js|mjs|cjs))?$/) ||
    n.match(/eslint\.config\.(\w+)?(\.(ts|js|mjs|cjs))?$/) ||
    n.includes('.env') ||
    n.startsWith('config/') ||
    n.startsWith('scripts/')
  ) {
    return true;
  }
  return false;
}

function touchesGithubWorkflow(path: string): boolean {
  return normalizePath(path).startsWith('.github/workflows/');
}

function touchesTests(path: string): boolean {
  const n = normalizePath(path);
  return (
    n.includes('.test.') ||
    n.includes('.spec.') ||
    n.startsWith('tests/')
  );
}

function touchesDocs(path: string): boolean {
  const n = normalizePath(path);
  return n.endsWith('.md') || n.startsWith('docs/');
}

function touchesSource(path: string): boolean {
  return normalizePath(path).startsWith('src/');
}

function touchesCorePaths(path: string): boolean {
  const n = normalizePath(path);
  return CORE_PREFIXES.some((pref) => n.startsWith(pref));
}

function sizeBandFromChanges(totalChanges: number): PrSizeBand {
  if (totalChanges <= 10) return 'TINY';
  if (totalChanges <= 50) return 'SMALL';
  if (totalChanges <= 150) return 'MEDIUM';
  if (totalChanges <= 400) return 'LARGE';
  return 'VERY_LARGE';
}

function collectSignals(files: readonly PrFileChange[], totalChanges: number): PrRiskSignals {
  let touchesDep = false;
  let touchesCfg = false;
  let touchesWf = false;
  let touchesTest = false;
  let touchesDoc = false;
  let touchesSrc = false;
  let touchesCore = false;
  let hasRemovals = false;
  let hasRenames = false;
  let hasUnknown = false;

  const areas = new Set<string>();
  for (const f of files) {
    const p = f.path || '';
    if (touchesDependencies(p)) {
      touchesDep = true;
      areas.add('dependencies');
    }
    if (touchesConfig(p)) {
      touchesCfg = true;
      areas.add('config');
    }
    if (touchesGithubWorkflow(p)) {
      touchesWf = true;
      areas.add('workflow');
    }
    if (touchesTests(p)) {
      touchesTest = true;
      areas.add('tests');
    }
    if (touchesDocs(p)) {
      touchesDoc = true;
      areas.add('docs');
    }
    if (touchesSource(p)) {
      touchesSrc = true;
      areas.add('source');
    }
    if (touchesCorePaths(p)) touchesCore = true;
    if (f.status === 'removed') hasRemovals = true;
    if (f.status === 'renamed') hasRenames = true;
    if (f.status === 'unknown') hasUnknown = true;
  }

  const band = sizeBandFromChanges(totalChanges);
  const hasLargeDiff = band === 'LARGE' || band === 'VERY_LARGE';
  const isCrossArea = areas.size >= 2;

  return Object.freeze({
    touchesDependencies: touchesDep,
    touchesConfig: touchesCfg,
    touchesGithubWorkflow: touchesWf,
    touchesTests: touchesTest,
    touchesDocs: touchesDoc,
    touchesSource: touchesSrc,
    touchesCorePaths: touchesCore,
    hasLargeDiff,
    hasFileRemovals: hasRemovals,
    hasRenames,
    hasUnknownFileStatus: hasUnknown,
    isCrossAreaChange: isCrossArea,
  });
}

function buildReasons(signals: PrRiskSignals): string[] {
  const r: string[] = [];
  if (signals.touchesCorePaths) r.push('Touches core paths');
  if (signals.touchesGithubWorkflow) r.push('Touches GitHub workflow files');
  if (signals.touchesDependencies) r.push('Includes dependency changes');
  if (signals.hasLargeDiff) r.push('Large diff');
  if (signals.isCrossAreaChange) r.push('Cross-area change');
  if (signals.hasFileRemovals) r.push('Includes file removals');
  if (signals.hasUnknownFileStatus) r.push('Includes unknown file status');
  if (signals.hasRenames) r.push('Includes file renames');
  if (signals.touchesConfig) r.push('Touches config files');
  return r;
}

function computeComplexity(
  band: PrSizeBand,
  signals: PrRiskSignals
): PrReviewComplexity {
  if (
    band === 'VERY_LARGE' ||
    signals.touchesCorePaths ||
    signals.touchesGithubWorkflow ||
    signals.hasUnknownFileStatus ||
    (signals.hasLargeDiff && signals.isCrossAreaChange) ||
    (signals.hasFileRemovals && (signals.touchesSource || signals.touchesConfig))
  ) {
    return 'HIGH';
  }
  if (
    band === 'MEDIUM' ||
    band === 'LARGE' ||
    signals.touchesDependencies ||
    signals.touchesConfig ||
    signals.hasRenames ||
    signals.isCrossAreaChange
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function computeRisky(signals: PrRiskSignals): boolean {
  return (
    signals.touchesCorePaths ||
    signals.touchesDependencies ||
    signals.touchesGithubWorkflow ||
    signals.hasUnknownFileStatus ||
    signals.hasLargeDiff ||
    signals.hasFileRemovals
  );
}

export function derivePrIntelligence(input: PrIntelligenceInput): PrIntelligenceResult {
  const insp = input.inspection;
  const files = insp.changedFiles ?? [];
  const totalChanges = insp.totalChanges ?? 0;

  const sizeBand = sizeBandFromChanges(totalChanges);
  const signals = collectSignals(files, totalChanges);
  const reviewComplexity = computeComplexity(sizeBand, signals);
  const risky = computeRisky(signals);
  const reasons = buildReasons(signals);

  return Object.freeze({
    sizeBand,
    reviewComplexity,
    risky,
    signals,
    reasons: Object.freeze([...reasons]),
    totals: Object.freeze({
      totalChangedFiles: insp.totalChangedFiles ?? files.length,
      totalAdditions: insp.totalAdditions ?? 0,
      totalDeletions: insp.totalDeletions ?? 0,
      totalChanges: insp.totalChanges ?? 0,
    }),
  });
}
