#!/usr/bin/env node
/**
 * Module Mapping — discovery-only, maps files to module domains.
 * Reads .ai-devos/dependency-graph.json, writes .ai-devos/module-map.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { deriveModuleMap } from './lib/module-mapping/derive-module-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, '.ai-devos');
const DEP_GRAPH_PATH = path.join(OUTPUT_DIR, 'dependency-graph.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'module-map.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to read ${filePath}: ${e.message}`);
  }
}

if (!fs.existsSync(DEP_GRAPH_PATH)) {
  console.error('Missing .ai-devos/dependency-graph.json. Run project:dependency-graph first.');
  process.exit(1);
}

const depGraph = readJsonSafe(DEP_GRAPH_PATH);
const map = deriveModuleMap(depGraph, {
  dependencyGraphPath: '.ai-devos/dependency-graph.json',
  repoScanPath: '.ai-devos/repo-scan.json',
});

ensureDir(OUTPUT_DIR);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(map, null, 2), 'utf-8');

const s = map.summary;
console.log('Module map generated.');
console.log(`Total files: ${s.totalFiles}`);
console.log(`Mapped: ${s.mappedFiles}`);
console.log(`Unassigned: ${s.unassignedFiles}`);
console.log(`Modules: ${s.moduleCount}`);
console.log(`Cross-module edges: ${s.crossModuleEdgeCount}`);
console.log('Output: .ai-devos/module-map.json');
