/**
 * Deterministic tests for dependency graph extractor.
 */

import assert from 'assert';
import { extractDependencies } from './lib/dependency-graph/extract-dependencies.mjs';
import { toSlash, resolveRelative, normalizePath } from './lib/dependency-graph/normalize-module-id.mjs';
import { buildDependencyGraph } from './lib/dependency-graph/build-dependency-graph.mjs';
import { collectSourceFiles } from './lib/dependency-graph/collect-source-files.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- extract-dependencies tests ---
{
  const text = `import x from 'pkg'; import { a } from "./mod";`;
  const deps = extractDependencies(text);
  assert(deps.includes('pkg'), 'extracts ES import');
  assert(deps.includes('./mod'), 'extracts relative import');
}

{
  const text = `export * from "./foo"; export { a } from './bar';`;
  const deps = extractDependencies(text);
  assert(deps.includes('./foo'), 'extracts export * from');
  assert(deps.includes('./bar'), 'extracts export { } from');
}

{
  const text = `const x = require("lodash"); const y = require('./local');`;
  const deps = extractDependencies(text);
  assert(deps.includes('lodash'), 'extracts require');
  assert(deps.includes('./local'), 'extracts require relative');
}

{
  const text = `import(variable); require(SomeVar);`;
  const deps = extractDependencies(text);
  assert.strictEqual(deps.length, 0, 'ignores non-literal dynamic imports');
}

{
  const text = `await import('./lazy');`;
  const deps = extractDependencies(text);
  assert(deps.includes('./lazy'), 'extracts static dynamic import');
}

{
  const text = `import 'pkg'; import 'pkg';`;
  const deps = extractDependencies(text);
  assert(deps.filter((d) => d === 'pkg').length >= 2, 'captures repeated imports');
}

// --- normalize tests ---
{
  assert.strictEqual(toSlash('a\\b\\c'), 'a/b/c', 'converts backslashes');
}

{
  const resolved = resolveRelative('src/foo/bar.ts', '../baz', '.');
  assert(resolved.includes('baz'), 'resolves relative path');
}

// --- collect-source-files tests ---
{
  const root = path.resolve(__dirname, '../..');
  const files = collectSourceFiles(root, ['tools']);
  assert(Array.isArray(files), 'returns array');
  assert(files.every((f) => typeof f === 'string'), 'all strings');
  assert(!files.some((f) => f.includes('node_modules')), 'ignores node_modules');
}

// --- build-dependency-graph tests ---
{
  const root = path.resolve(__dirname, '../..');
  const graph = buildDependencyGraph(root);
  assert.strictEqual(graph.generatedAt, 'deterministic', 'deterministic marker');
  assert(typeof graph.summary.sourceFileCount === 'number', 'has sourceFileCount');
  assert(Array.isArray(graph.externalPackages), 'has externalPackages array');
  assert(typeof graph.modules === 'object', 'has modules object');
}

{
  const root = path.resolve(__dirname, '../..');
  const a = buildDependencyGraph(root);
  const b = buildDependencyGraph(root);
  assert.deepStrictEqual(a, b, 'deterministic across runs');
}

{
  const root = path.resolve(__dirname, '../..');
  const graph = buildDependencyGraph(root);
  const keys = Object.keys(graph.modules);
  const sorted = [...keys].sort();
  assert.deepStrictEqual(keys, sorted, 'module keys sorted');
}

{
  const root = path.resolve(__dirname, '../..');
  const graph = buildDependencyGraph(root);
  assert.deepStrictEqual(
    graph.externalPackages,
    [...graph.externalPackages].sort(),
    'externalPackages sorted'
  );
}

console.log('All dependency-graph tests passed.');
