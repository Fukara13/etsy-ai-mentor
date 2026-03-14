#!/usr/bin/env node
/**
 * Architecture Summary — PH-4 stage of Project Understanding pipeline.
 * Transforms repo-scan, dependency-graph, module-map into deterministic
 * machine-readable architecture model. No LLM, no randomness, read-only.
 * Writes .ai-devos/architecture-summary.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildArchitectureSummary } from './lib/architecture-summary/build-architecture-summary.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const AI_DEVOS = path.join(ROOT, '.ai-devos');
const REPO_SCAN_PATH = path.join(AI_DEVOS, 'repo-scan.json');
const DEP_GRAPH_PATH = path.join(AI_DEVOS, 'dependency-graph.json');
const MODULE_MAP_PATH = path.join(AI_DEVOS, 'module-map.json');
const OUTPUT_PATH = path.join(AI_DEVOS, 'architecture-summary.json');

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const depGraph = readJsonSafe(DEP_GRAPH_PATH);
  const moduleMap = readJsonSafe(MODULE_MAP_PATH);

  if (!depGraph) {
    console.error('Missing .ai-devos/dependency-graph.json. Run project:dependency-graph first.');
    process.exit(1);
  }
  if (!moduleMap) {
    console.error('Missing .ai-devos/module-map.json. Run project:module-mapping first.');
    process.exit(1);
  }

  const repoScan = readJsonSafe(REPO_SCAN_PATH);
  const packageJson = readJsonSafe(path.join(ROOT, 'package.json'));

  const lockfiles = {
    npm: fs.existsSync(path.join(ROOT, 'package-lock.json')),
    pnpm: fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml')),
    yarn: fs.existsSync(path.join(ROOT, 'yarn.lock')),
  };

  const workflowsDir = path.join(ROOT, '.github', 'workflows');
  const hasGitHubWorkflows =
    fs.existsSync(workflowsDir) && fs.statSync(workflowsDir).isDirectory();

  const context = {
    packageJson,
    lockfiles,
    repoRootName: path.basename(ROOT),
    fsSignals: { hasGitHubWorkflows },
  };

  const summary = buildArchitectureSummary({
    repoScan,
    dependencyGraph: depGraph,
    moduleMap,
    context,
  });

  ensureDir(AI_DEVOS);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('Architecture summary generated.');
  console.log(`Output: .ai-devos/architecture-summary.json`);
}

main();
