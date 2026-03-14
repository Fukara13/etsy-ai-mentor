#!/usr/bin/env node
/**
 * Risk Hotspot Detection — PH-4 stage of Project Understanding pipeline.
 * Reads dependency-graph, module-map, architecture-summary and generates
 * deterministic module-level risk hotspot report. No LLM, no ownership inference.
 * Writes .ai-devos/hotspot-report.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateHotspotReport } from './lib/risk-hotspots/build-hotspot-report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const AI_DEVOS = path.join(ROOT, '.ai-devos');
const DEP_GRAPH_PATH = path.join(AI_DEVOS, 'dependency-graph.json');
const MODULE_MAP_PATH = path.join(AI_DEVOS, 'module-map.json');
const ARCH_SUMMARY_PATH = path.join(AI_DEVOS, 'architecture-summary.json');
const OUTPUT_PATH = path.join(AI_DEVOS, 'hotspot-report.json');

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid JSON: ${filePath} - ${e.message}`);
  }
}

function writeJsonFile(filePath, data) {
  const keys = [
    'version',
    'generatedFrom',
    'summary',
    'weights',
    'thresholds',
    'hotspots',
  ];
  const ordered = {};
  for (const k of keys) {
    if (k in data) ordered[k] = data[k];
  }
  fs.writeFileSync(filePath, JSON.stringify(ordered, null, 2), 'utf-8');
}

function main() {
  if (!fs.existsSync(DEP_GRAPH_PATH)) {
    console.error('Missing .ai-devos/dependency-graph.json. Run project:dependency-graph first.');
    process.exit(1);
  }
  if (!fs.existsSync(MODULE_MAP_PATH)) {
    console.error('Missing .ai-devos/module-map.json. Run project:module-mapping first.');
    process.exit(1);
  }
  if (!fs.existsSync(ARCH_SUMMARY_PATH)) {
    console.error('Missing .ai-devos/architecture-summary.json. Run ai-devos:architecture-summary first.');
    process.exit(1);
  }

  const dependencyGraph = readJsonFile(DEP_GRAPH_PATH);
  const moduleMap = readJsonFile(MODULE_MAP_PATH);
  const archSummary = readJsonFile(ARCH_SUMMARY_PATH);

  const report = generateHotspotReport(dependencyGraph, moduleMap, archSummary);

  if (!fs.existsSync(AI_DEVOS)) {
    fs.mkdirSync(AI_DEVOS, { recursive: true });
  }
  writeJsonFile(OUTPUT_PATH, report);

  console.log('Hotspot report generated.');
  console.log('Output: .ai-devos/hotspot-report.json');
}

main();
