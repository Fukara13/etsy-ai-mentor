/**
 * Deterministic template-based explanations.
 */

export function buildExplanations(signals, ownerCandidate, runnerUpCandidate, ownershipType) {
  const explanations = [];
  const path = signals?.pathAffinity ?? 0;
  const role = signals?.roleAffinity ?? 0;
  const dep = signals?.dependencyAffinity ?? 0;
  const test = signals?.testAffinity ?? 0;
  const hotspot = signals?.hotspotAffinity ?? 0;

  if (path >= 0.7 && ownerCandidate && ownerCandidate !== 'unknown') {
    explanations.push(`module path strongly aligns with ${ownerCandidate} domain`);
  }
  if (role >= 0.5 && ownerCandidate && ownerCandidate !== 'unknown') {
    explanations.push(`module role aligns with ${ownerCandidate} responsibilities`);
  }
  if (dep >= 0.5 && ownerCandidate && ownerCandidate !== 'unknown') {
    explanations.push(`dependency neighborhood clusters around ${ownerCandidate} modules`);
  }
  if (test >= 0.5 && ownerCandidate && ownerCandidate !== 'unknown') {
    explanations.push(`test proximity supports ${ownerCandidate} ownership`);
  }
  if (hotspot >= 0.5 && ownerCandidate && ownerCandidate !== 'unknown') {
    explanations.push(`hotspot interaction patterns support ${ownerCandidate} ownership`);
  }
  if (ownershipType === 'SHARED' && runnerUpCandidate) {
    explanations.push('top two ownership candidates are too close to separate confidently');
  }
  if (ownershipType === 'UNKNOWN' || ownerCandidate === 'unknown') {
    explanations.push('signals were insufficient for confident ownership inference');
  }
  if (ownershipType === 'SHARED' && runnerUpCandidate) {
    explanations.push('top two ownership candidates are too close to separate confidently');
  }

  if (explanations.length < 2 && ownerCandidate && ownerCandidate !== 'unknown' && path >= 0.5) {
    if (!explanations.some((e) => e.includes('path strongly'))) {
      explanations.push(`module path strongly aligns with ${ownerCandidate} domain`);
    }
  }
  if (explanations.length < 2 && ownerCandidate && ownerCandidate !== 'unknown' && role >= 0.3) {
    if (!explanations.some((e) => e.includes('role aligns'))) {
      explanations.push(`module role aligns with ${ownerCandidate} responsibilities`);
    }
  }

  return explanations.slice(0, 4).sort((a, b) => a.localeCompare(b));
}
