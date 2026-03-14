#!/usr/bin/env node
/**
 * Dependency Graph — discovery-only extraction.
 * Writes .ai-devos/dependency-graph.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDependencyGraph } from './lib/dependency-graph/build-dependency-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUTPUT_DIR = path.join(ROOT, '.ai-devos');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dependency-graph.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const graph = buildDependencyGraph(ROOT);
ensureDir(OUTPUT_DIR);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(graph, null, 2), 'utf-8');

const s = graph.summary;
console.log('Dependency graph generated.');
console.log(`Source files: ${s.sourceFileCount}`);
console.log(`Internal modules: ${s.internalModuleCount}`);
console.log(`External packages: ${s.externalPackageCount}`);
console.log(`Edges: ${s.edgeCount}`);
console.log(`Output: .ai-devos/dependency-graph.json`);
