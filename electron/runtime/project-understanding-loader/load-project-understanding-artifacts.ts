/**
 * RE-12: Loader for .ai-devos project-understanding artifacts.
 * File I/O in Electron adapter layer only. Missing files never throw.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ProjectUnderstandingArtifactBundle } from './project-understanding-artifact-bundle';

const AI_DEVOS_DIR = '.ai-devos';
const ARTIFACT_FILES = {
  architectureSummary: 'architecture-summary.json',
  dependencyGraph: 'dependency-graph.json',
  moduleMap: 'module-map.json',
  riskHotspots: 'hotspot-report.json',
} as const;

/**
 * Tries to read and parse JSON from a file. Returns null if missing or invalid.
 */
function safeReadJson(baseDir: string, filename: string): Record<string, unknown> | null {
  const filePath = path.join(baseDir, AI_DEVOS_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Loads .ai-devos artifacts from the given base directory (typically process.cwd()).
 * Missing or invalid files yield null for that field. Never throws.
 */
export function loadProjectUnderstandingArtifacts(
  baseDir: string
): ProjectUnderstandingArtifactBundle {
  const architectureSummary = safeReadJson(baseDir, ARTIFACT_FILES.architectureSummary);
  const dependencyGraph = safeReadJson(baseDir, ARTIFACT_FILES.dependencyGraph);
  const moduleMap = safeReadJson(baseDir, ARTIFACT_FILES.moduleMap);
  const riskHotspots = safeReadJson(baseDir, ARTIFACT_FILES.riskHotspots);

  return Object.freeze({
    architectureSummary,
    dependencyGraph,
    moduleMap,
    riskHotspots,
  });
}
