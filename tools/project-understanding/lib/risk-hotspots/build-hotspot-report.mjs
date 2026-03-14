/**
 * Build deterministic risk hotspot report from discovery artifacts.
 * Module-level scoring only. No ownership, no repair logic.
 */

const WEIGHTS = {
  inboundDependencyWeight: 1,
  outboundDependencyWeight: 1,
  circularDependencyWeight: 1,
  lowTestDensityWeight: 1,
  moduleSizeWeight: 1,
  crossModuleInteractionWeight: 1,
};

const MAX_FACTOR_SCORES = {
  inboundDependencyScore: 20,
  outboundDependencyScore: 15,
  circularDependencyScore: 20,
  lowTestDensityScore: 15,
  moduleSizeScore: 15,
  crossModuleInteractionScore: 15,
};

const THRESHOLDS = {
  highRiskMin: 70,
  mediumRiskMin: 40,
};

const LOW_TEST_DENSITY_THRESHOLD = 0.2;
const LARGE_MODULE_FILE_COUNT = 30;
const HIGH_INBOUND = 5;
const HIGH_OUTBOUND = 5;
const HIGH_CROSS_INTERACTION = 3;

/**
 * Clamp and round value to 0..max.
 */
function clampScore(val, max) {
  const n = Number(val);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(max, Math.round(n));
}

/**
 * Compute inbound/outbound counts per module from module-map crossModuleEdges.
 * Returns { inbound: Map<moduleName, number>, outbound: Map<moduleName, number> }.
 */
export function computeInboundOutboundCounts(moduleMap) {
  const edges = moduleMap?.crossModuleEdges || [];
  const modules = moduleMap?.modules || [];
  const idToName = new Map(modules.map((m) => [m.id, m.name]));

  const inbound = new Map();
  const outbound = new Map();

  for (const m of modules) {
    inbound.set(m.name, 0);
    outbound.set(m.name, 0);
  }

  for (const e of edges) {
    const fromName = idToName.get(e.fromModuleId) ?? e.fromModuleId;
    const toName = idToName.get(e.toModuleId) ?? e.toModuleId;
    const count = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
    inbound.set(toName, (inbound.get(toName) ?? 0) + count);
    outbound.set(fromName, (outbound.get(fromName) ?? 0) + count);
  }

  return { inbound, outbound };
}

/**
 * Compute cross-module interaction count per module from architecture-summary.
 */
export function computeCrossInteractionCounts(archSummary) {
  const edges = archSummary?.crossModuleInteractions || [];
  const counts = new Map();
  for (const e of edges) {
    const from = e.from;
    const to = e.to;
    const c = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
    counts.set(from, (counts.get(from) ?? 0) + c);
    counts.set(to, (counts.get(to) ?? 0) + c);
  }
  return counts;
}

/**
 * Modules participating in circular dependencies (from highCouplingModules).
 */
export function getCircularModuleSet(archSummary) {
  return new Set(archSummary?.signals?.highCouplingModules || []);
}

/**
 * Per-module test density: 1 if module in testModules, else 0.
 * Use global testDensity as fallback for modules not in testModules.
 */
export function getModuleTestDensity(archSummary, moduleName) {
  const testModules = archSummary?.testTopology?.testModules || [];
  const globalDensity = archSummary?.testTopology?.testDensity ?? 0;
  if (testModules.includes(moduleName)) return globalDensity;
  return 0;
}

export function deriveRiskLevel(score) {
  const s = clampScore(score, 100);
  if (s >= THRESHOLDS.highRiskMin) return 'HIGH';
  if (s >= THRESHOLDS.mediumRiskMin) return 'MEDIUM';
  return 'LOW';
}

/**
 * Normalize factor to 0..max using simple scaling.
 */
function normalizeInbound(val, maxIn) {
  if (maxIn <= 0) return 0;
  return Math.min(1, val / Math.max(5, maxIn)) * MAX_FACTOR_SCORES.inboundDependencyScore;
}

function normalizeOutbound(val, maxOut) {
  if (maxOut <= 0) return 0;
  return Math.min(1, val / Math.max(5, maxOut)) * MAX_FACTOR_SCORES.outboundDependencyScore;
}

function normalizeCrossInteraction(val, maxVal) {
  if (maxVal <= 0) return 0;
  return Math.min(1, val / Math.max(3, maxVal)) * MAX_FACTOR_SCORES.crossModuleInteractionScore;
}

function normalizeModuleSize(val, maxVal) {
  if (maxVal <= 0) return 0;
  return Math.min(1, val / Math.max(LARGE_MODULE_FILE_COUNT, maxVal)) * MAX_FACTOR_SCORES.moduleSizeScore;
}

/**
 * Low test density = higher risk. Score 0..15.
 * density 1 -> 0, density 0 -> 15.
 */
function scoreLowTestDensity(density) {
  const d = Number(density);
  if (Number.isNaN(d) || d >= 1) return 0;
  const risk = 1 - d;
  return clampScore(risk * MAX_FACTOR_SCORES.lowTestDensityScore, MAX_FACTOR_SCORES.lowTestDensityScore);
}

export function deriveReasons(factors, factorScores) {
  const reasons = [];
  if ((factors.inboundDependencies ?? 0) >= HIGH_INBOUND) {
    reasons.push('high inbound dependency count');
  }
  if ((factors.outboundDependencies ?? 0) >= HIGH_OUTBOUND) {
    reasons.push('high outbound dependency count');
  }
  if ((factors.circularDependencySignals ?? 0) > 0) {
    reasons.push('participates in circular dependency signals');
  }
  const density = factors.testDensity ?? 0;
  if (density < LOW_TEST_DENSITY_THRESHOLD && (factorScores?.lowTestDensityScore ?? 0) > 0) {
    reasons.push('below-average test density');
  }
  if ((factors.moduleFileCount ?? 0) >= LARGE_MODULE_FILE_COUNT) {
    reasons.push('large module by file count');
  }
  if ((factors.crossModuleInteractions ?? 0) >= HIGH_CROSS_INTERACTION) {
    reasons.push('frequent cross-module interaction surface');
  }
  return reasons;
}

/**
 * Score a single module hotspot.
 */
export function scoreModuleHotspot(moduleName, ctx) {
  const {
    inboundCount,
    outboundCount,
    circularParticipant,
    testDensity,
    fileCount,
    crossInteractionCount,
    maxInbound,
    maxOutbound,
    maxFileCount,
    maxCrossInteraction,
  } = ctx;

  const inboundScore = clampScore(
    normalizeInbound(inboundCount, maxInbound),
    MAX_FACTOR_SCORES.inboundDependencyScore
  );
  const outboundScore = clampScore(
    normalizeOutbound(outboundCount, maxOutbound),
    MAX_FACTOR_SCORES.outboundDependencyScore
  );
  const circularScore = circularParticipant
    ? MAX_FACTOR_SCORES.circularDependencyScore
    : 0;
  const lowTestScore = scoreLowTestDensity(testDensity);
  const moduleSizeScore = clampScore(
    normalizeModuleSize(fileCount, maxFileCount),
    MAX_FACTOR_SCORES.moduleSizeScore
  );
  const crossInteractionScore = clampScore(
    normalizeCrossInteraction(crossInteractionCount, maxCrossInteraction),
    MAX_FACTOR_SCORES.crossModuleInteractionScore
  );

  const total = inboundScore + outboundScore + circularScore + lowTestScore + moduleSizeScore + crossInteractionScore;
  const clampedTotal = Math.min(100, Math.round(total));

  const factors = {
    inboundDependencies: inboundCount,
    outboundDependencies: outboundCount,
    circularDependencySignals: circularParticipant ? 1 : 0,
    testDensity,
    moduleFileCount: fileCount,
    crossModuleInteractions: crossInteractionCount,
  };

  const factorScores = {
    inboundDependencyScore: inboundScore,
    outboundDependencyScore: outboundScore,
    circularDependencyScore: circularScore,
    lowTestDensityScore: lowTestScore,
    moduleSizeScore,
    crossModuleInteractionScore: crossInteractionScore,
  };

  const reasons = deriveReasons(factors, factorScores);

  return {
    module: moduleName,
    score: clampedTotal,
    riskLevel: deriveRiskLevel(clampedTotal),
    factors,
    factorScores,
    reasons,
  };
}

/**
 * Generate full hotspot report.
 */
export function generateHotspotReport(dependencyGraph, moduleMap, archSummary) {
  const modules = archSummary?.modules?.modules ?? moduleMap?.modules ?? [];
  const moduleList = Array.isArray(modules)
    ? modules.map((m) => (typeof m === 'string' ? m : m.name))
    : [];

  const { inbound, outbound } = computeInboundOutboundCounts(moduleMap);
  const crossInteractionCounts = computeCrossInteractionCounts(archSummary);
  const circularSet = getCircularModuleSet(archSummary);

  const nameToFileCount = new Map();
  for (const m of modules) {
    const name = typeof m === 'string' ? m : m.name;
    const fc = typeof m === 'object' && typeof m.fileCount === 'number' ? m.fileCount : 0;
    nameToFileCount.set(name, fc);
  }

  const maxInbound = Math.max(1, ...inbound.values());
  const maxOutbound = Math.max(1, ...outbound.values());
  const maxFileCount = Math.max(1, ...nameToFileCount.values());
  const maxCross = Math.max(1, ...crossInteractionCounts.values()) || 1;

  const hotspots = [];
  for (const modName of moduleList) {
    const ctx = {
      inboundCount: inbound.get(modName) ?? 0,
      outboundCount: outbound.get(modName) ?? 0,
      circularParticipant: circularSet.has(modName),
      testDensity: getModuleTestDensity(archSummary, modName),
      fileCount: nameToFileCount.get(modName) ?? 0,
      crossInteractionCount: crossInteractionCounts.get(modName) ?? 0,
      maxInbound,
      maxOutbound,
      maxFileCount,
      maxCrossInteraction: maxCross,
    };
    hotspots.push(scoreModuleHotspot(modName, ctx));
  }

  hotspots.sort((a, b) => {
    const cmp = (b.score ?? 0) - (a.score ?? 0);
    return cmp !== 0 ? cmp : (a.module || '').localeCompare(b.module || '');
  });

  hotspots.forEach((h, i) => {
    h.rank = i + 1;
  });

  const scores = hotspots.map((h) => h.score).filter((s) => typeof s === 'number');
  const totalModules = hotspots.length;
  const hotspotCount = hotspots.filter((h) => (h.score ?? 0) >= THRESHOLDS.mediumRiskMin).length;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return {
    version: 1,
    generatedFrom: {
      dependencyGraph: '.ai-devos/dependency-graph.json',
      moduleMap: '.ai-devos/module-map.json',
      architectureSummary: '.ai-devos/architecture-summary.json',
    },
    summary: {
      totalModules,
      hotspotCount,
      maxScore: Math.round(maxScore),
      averageScore: Math.round(averageScore * 100) / 100,
    },
    weights: WEIGHTS,
    thresholds: THRESHOLDS,
    hotspots,
  };
}
