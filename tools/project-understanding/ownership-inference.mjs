#!/usr/bin/env node
/**
 * Ownership Inference — PH-4 stage of Project Understanding pipeline.
 * Infers structural ownership buckets from discovery artifacts. Informational only.
 * No Git, no GitHub API, no LLM, no mutation. Writes .ai-devos/ownership-map.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildOwnershipMap } from './lib/ownership-inference/build-ownership-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const AI_DEVOS = path.join(ROOT, '.ai-devos');
const HOTSPOT_PATH = path.join(AI_DEVOS, 'hotspot-report.json');
const MODULE_MAP_PATH = path.join(AI_DEVOS, 'module-map.json');
const DEP_GRAPH_PATH = path.join(AI_DEVOS, 'dependency-graph.json');
const ARCH_SUMMARY_PATH = path.join(AI_DEVOS, 'architecture-summary.json');
const OUTPUT_PATH = path.join(AI_DEVOS, 'ownership-map.json');

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${filePath} - ${e.message}`);
  }
}

function main() {
  if (!fs.existsSync(HOTSPOT_PATH)) {
    console.error('Missing .ai-devos/hotspot-report.json. Run ai-devos:risk-hotspots first.');
    process.exit(1);
  }
  if (!fs.existsSync(MODULE_MAP_PATH)) {
    console.error('Missing .ai-devos/module-map.json. Run project:module-mapping first.');
    process.exit(1);
  }
  if (!fs.existsSync(DEP_GRAPH_PATH)) {
    console.error('Missing .ai-devos/dependency-graph.json. Run project:dependency-graph first.');
    process.exit(1);
  }
  if (!fs.existsSync(ARCH_SUMMARY_PATH)) {
    console.error('Missing .ai-devos/architecture-summary.json. Run ai-devos:architecture-summary first.');
    process.exit(1);
  }

  const hotspotReport = readJsonFile(HOTSPOT_PATH);
  const moduleMap = readJsonFile(MODULE_MAP_PATH);
  const dependencyGraph = readJsonFile(DEP_GRAPH_PATH);
  const archSummary = readJsonFile(ARCH_SUMMARY_PATH);

  const result = buildOwnershipMap(
    dependencyGraph,
    moduleMap,
    archSummary,
    hotspotReport
  );

  if (!fs.existsSync(AI_DEVOS)) {
    fs.mkdirSync(AI_DEVOS, { recursive: true });
  }
  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ summary: result.summary, thresholds: result.thresholds, ownership: result.ownership }, null, 2),
    'utf-8'
  );

  console.log('Ownership map generated.');
  console.log('Output: .ai-devos/ownership-map.json');
}

main();
