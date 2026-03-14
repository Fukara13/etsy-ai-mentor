/**
 * RE-12: Pure deterministic derivation of runtime project understanding.
 * No I/O, no time, no randomness.
 */

import type { ProjectUnderstandingRuntimeInput } from './project-understanding-runtime-input';
import type { ProjectUnderstandingRuntimeResult } from './project-understanding-runtime-result';
import type { ProjectUnderstandingArtifactStatus } from './project-understanding-runtime-result';

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').trim();
}

function getFileMappings(moduleMap: Record<string, unknown> | null): Array<{ filePath: string; moduleId: string }> {
  if (!moduleMap || !Array.isArray(moduleMap.fileMappings)) return [];
  const out: Array<{ filePath: string; moduleId: string }> = [];
  for (const m of moduleMap.fileMappings) {
    const mp = m as { filePath?: unknown; moduleId?: unknown };
    if (typeof mp.filePath === 'string' && typeof mp.moduleId === 'string') {
      out.push({ filePath: normalizePath(mp.filePath), moduleId: mp.moduleId });
    }
  }
  return out;
}

function moduleIdToName(modules: Array<{ id?: unknown; name?: unknown }>, id: string): string | null {
  const m = modules.find((x) => x.id === id);
  return m && typeof m.name === 'string' ? m.name : null;
}

function countFilesByModule(
  changedFiles: readonly string[],
  fileMappings: Array<{ filePath: string; moduleId: string }>
): Map<string, number> {
  const counts = new Map<string, number>();
  const normalizedChanged = new Set(changedFiles.map(normalizePath));
  for (const fp of normalizedChanged) {
    const mapping = fileMappings.find((m) => normalizePath(m.filePath) === fp);
    if (mapping) {
      counts.set(mapping.moduleId, (counts.get(mapping.moduleId) ?? 0) + 1);
    }
  }
  return counts;
}

function pickDominantModule(counts: Map<string, number>): string | null {
  if (counts.size === 0) return null;
  let maxCount = 0;
  const top: string[] = [];
  for (const [mod, c] of counts) {
    if (c > maxCount) {
      maxCount = c;
      top.length = 0;
      top.push(mod);
    } else if (c === maxCount) {
      top.push(mod);
    }
  }
  top.sort();
  return top[0] ?? null;
}

function getHotspotData(
  riskHotspots: Record<string, unknown> | null,
  moduleName: string | null
): { score: number | null; riskLevel: string | null } {
  if (!riskHotspots || !moduleName) return { score: null, riskLevel: null };
  const hotspots = riskHotspots.hotspots;
  if (!Array.isArray(hotspots)) return { score: null, riskLevel: null };
  const h = hotspots.find((x: { module?: unknown }) => x.module === moduleName);
  if (!h) return { score: null, riskLevel: null };
  return {
    score: typeof (h as { score?: unknown }).score === 'number' ? (h as { score: number }).score : null,
    riskLevel: typeof (h as { riskLevel?: unknown }).riskLevel === 'string' ? (h as { riskLevel: string }).riskLevel : null,
  };
}

function getArchRole(
  archSummary: Record<string, unknown> | null,
  moduleName: string | null
): string | null {
  if (!archSummary || !moduleName) return null;
  const mods = archSummary.modules as { modules?: Array<{ name?: unknown; role?: unknown }> } | undefined;
  if (!mods || !Array.isArray(mods.modules)) return null;
  const m = mods.modules.find((x) => x.name === moduleName);
  return m && typeof m.role === 'string' ? m.role : null;
}

function getBlastRadius(
  depGraph: Record<string, unknown> | null,
  changedFiles: readonly string[]
): number | null {
  if (!depGraph || changedFiles.length === 0) return null;
  const modules = depGraph.modules as Record<string, { internal?: unknown[] }> | undefined;
  if (!modules || typeof modules !== 'object') return null;
  const normalized = new Set(changedFiles.map(normalizePath));
  let total = 0;
  for (const fp of normalized) {
    const entry = modules[fp];
    if (entry && Array.isArray(entry.internal)) total += entry.internal.length;
  }
  return total;
}

function deriveArtifactStatus(bundle: ProjectUnderstandingRuntimeInput['artifactBundle']): ProjectUnderstandingArtifactStatus {
  const has = [bundle.architectureSummary, bundle.dependencyGraph, bundle.moduleMap, bundle.riskHotspots].filter(Boolean).length;
  if (has === 4) return 'available';
  if (has > 0) return 'partial';
  return 'missing';
}

function buildSummarySignals(
  status: ProjectUnderstandingArtifactStatus,
  moduleName: string | null,
  layer: string | null,
  riskLevel: string | null,
  blastRadius: number | null
): string[] {
  const signals: string[] = [];
  signals.push(`artifact_status:${status}`);
  if (moduleName) signals.push(`module:${moduleName}`);
  if (layer) signals.push(`layer:${layer}`);
  if (riskLevel) signals.push(`risk:${riskLevel}`);
  if (blastRadius != null) signals.push(`blast_radius:${blastRadius}`);
  return signals;
}

export function deriveProjectUnderstandingRuntime(
  input: ProjectUnderstandingRuntimeInput
): ProjectUnderstandingRuntimeResult {
  const { changedFiles, artifactBundle } = input;
  const status = deriveArtifactStatus(artifactBundle);

  const modules = (artifactBundle.moduleMap?.modules as Array<{ id?: unknown; name?: unknown }>) ?? [];
  const fileMappings = getFileMappings(artifactBundle.moduleMap);
  const counts = countFilesByModule(changedFiles, fileMappings);
  const dominantModuleId = pickDominantModule(counts);
  const moduleName = dominantModuleId ? moduleIdToName(modules, dominantModuleId) : null;

  const { score: moduleHotspotScore, riskLevel: moduleRiskLevel } = getHotspotData(
    artifactBundle.riskHotspots,
    moduleName
  );
  const architecturalLayer = getArchRole(artifactBundle.architectureSummary, moduleName);
  const dependencyBlastRadius = getBlastRadius(artifactBundle.dependencyGraph, changedFiles);

  return Object.freeze({
    artifactStatus: status,
    architecturalLayer,
    moduleName,
    moduleOwner: null,
    moduleHotspotScore,
    moduleRiskLevel,
    dependencyBlastRadius,
    summarySignals: Object.freeze(buildSummarySignals(
      status,
      moduleName,
      architecturalLayer,
      moduleRiskLevel,
      dependencyBlastRadius
    )),
  });
}
