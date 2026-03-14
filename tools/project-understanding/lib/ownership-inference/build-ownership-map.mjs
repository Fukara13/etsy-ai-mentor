/**
 * Build deterministic ownership map from discovery artifacts.
 */

import { pathToBucket, BUCKETS } from './bucket-rules.mjs';
import { inferPathAffinity } from './infer-path-affinity.mjs';
import { inferRoleAffinity } from './infer-role-affinity.mjs';
import { inferDependencyAffinity } from './infer-dependency-affinity.mjs';
import { inferTestAffinity } from './infer-test-affinity.mjs';
import { inferHotspotAffinity } from './infer-hotspot-affinity.mjs';
import { scoreOwnershipSignals } from './score-ownership-signals.mjs';
import { buildExplanations } from './explanation-templates.mjs';
import { normalizeScore } from './normalize-score.mjs';

const THRESHOLDS = {
  highConfidenceMin: 0.75,
  mediumConfidenceMin: 0.5,
  sharedDeltaMax: 0.1,
  unknownMinConfidence: 0.35,
};

function getOrderedBucketScores(bucketScores) {
  return BUCKETS.map((b) => ({ bucket: b, score: bucketScores[b] ?? 0 }))
    .sort((a, b) => (b.score - a.score !== 0 ? b.score - a.score : a.bucket.localeCompare(b.bucket)));
}

export function buildOwnershipMap(dependencyGraph, moduleMap, archSummary, hotspotReport) {
  const modules = archSummary?.modules?.modules ?? moduleMap?.modules ?? [];
  const moduleList = Array.isArray(modules)
    ? modules.map((m) => (typeof m === 'string' ? m : m.name))
    : [];
  const moduleNames = new Set(moduleList);

  const nameToRole = new Map();
  const nameToKind = new Map();
  for (const m of modules) {
    const name = typeof m === 'string' ? m : m.name;
    nameToRole.set(name, typeof m === 'object' ? m.role : null);
    nameToKind.set(name, typeof m === 'object' ? m.kind : null);
  }

  const crossModuleInteractions = archSummary?.crossModuleInteractions || [];
  const testModules = archSummary?.testTopology?.testModules || [];

  const ownership = [];
  for (const modName of moduleList) {
    const pathAff = inferPathAffinity(modName);
    const roleAff = inferRoleAffinity(
      modName,
      nameToRole.get(modName),
      nameToKind.get(modName)
    );
    const depAff = inferDependencyAffinity(
      modName,
      crossModuleInteractions,
      moduleNames
    );
    const testAff = inferTestAffinity(modName, testModules);
    const hotspotAff = inferHotspotAffinity(
      modName,
      hotspotReport,
      crossModuleInteractions,
      moduleNames
    );

    const bucketScores = scoreOwnershipSignals(pathAff, roleAff, depAff, testAff, hotspotAff);
    const ordered = getOrderedBucketScores(bucketScores);
    const top = ordered[0];
    const second = ordered[1];
    const topScore = top?.score ?? 0;
    const secondScore = second?.score ?? 0;

    const bucketForTop = top?.bucket ?? 'unknown';
    const bucketForSecond = second?.bucket ?? 'unknown';

    let ownershipType, ownerCandidate, runnerUpCandidate;
    if (topScore < THRESHOLDS.unknownMinConfidence) {
      ownershipType = 'UNKNOWN';
      ownerCandidate = 'unknown';
      runnerUpCandidate = undefined;
    } else if (topScore - secondScore <= THRESHOLDS.sharedDeltaMax) {
      ownershipType = 'SHARED';
      ownerCandidate = bucketForTop;
      runnerUpCandidate = bucketForSecond;
    } else {
      ownershipType = 'PRIMARY';
      ownerCandidate = bucketForTop;
      runnerUpCandidate = undefined;
    }

    const confidence = normalizeScore(topScore);

    const signalBucket = ownerCandidate !== 'unknown' ? ownerCandidate : bucketForTop;
    const signals = {
      pathAffinity: normalizeScore(pathAff[signalBucket] ?? 0),
      roleAffinity: normalizeScore(roleAff[signalBucket] ?? 0),
      dependencyAffinity: normalizeScore(depAff[signalBucket] ?? 0),
      testAffinity: normalizeScore(testAff[signalBucket] ?? 0),
      hotspotAffinity: normalizeScore(hotspotAff[signalBucket] ?? 0),
    };

    const explanations = buildExplanations(
      signals,
      ownerCandidate,
      ownershipType === 'SHARED' ? runnerUpCandidate : undefined,
      ownershipType
    );

    const record = {
      module: modName,
      ownerCandidate,
      ownershipType,
      confidence,
      signals,
      explanations,
    };
    if (runnerUpCandidate !== undefined && ownershipType === 'SHARED') {
      record.runnerUpCandidate = runnerUpCandidate;
      record.runnerUpScore = normalizeScore(secondScore);
    }
    ownership.push(record);
  }

  ownership.sort((a, b) => (a.module || '').localeCompare(b.module || ''));

  const primaryCount = ownership.filter((o) => o.ownershipType === 'PRIMARY').length;
  const sharedCount = ownership.filter((o) => o.ownershipType === 'SHARED').length;
  const unknownCount = ownership.filter((o) => o.ownershipType === 'UNKNOWN').length;
  const highConfidenceCount = ownership.filter((o) => (o.confidence ?? 0) >= THRESHOLDS.highConfidenceMin).length;
  const mediumConfidenceCount = ownership.filter(
    (o) => (o.confidence ?? 0) >= THRESHOLDS.mediumConfidenceMin && (o.confidence ?? 0) < THRESHOLDS.highConfidenceMin
  ).length;
  const lowConfidenceCount = ownership.filter((o) => (o.confidence ?? 0) < THRESHOLDS.mediumConfidenceMin).length;

  return {
    summary: {
      totalModules: ownership.length,
      primaryCount,
      sharedCount,
      unknownCount,
      highConfidenceCount,
      mediumConfidenceCount,
      lowConfidenceCount,
    },
    thresholds: THRESHOLDS,
    ownership,
  };
}
