#!/usr/bin/env node
/**
 * Repo Scanner — discovery-only structural inventory.
 * Produces a clean structural summary. No interpretation or recommendations.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-electron', '.cursor', 'release']);

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function getTopLevel() {
  const entries = readDirSafe(ROOT)
    .filter((e) => !IGNORE_DIRS.has(e.name))
    .sort((a, b) => {
      const aDir = a.isDirectory() ? 0 : 1;
      const bDir = b.isDirectory() ? 0 : 1;
      if (aDir !== bDir) return aDir - bDir;
      return a.name.localeCompare(b.name);
    });
  return entries.map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}

function getSubsystemFolders(dir) {
  if (!exists(dir)) return [];
  const entries = readDirSafe(dir).filter((e) => e.isDirectory() && !e.name.startsWith('.'));
  return entries.map((e) => e.name).sort();
}

function findConfigs() {
  const candidates = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'tsconfig.electron.json',
    'tsconfig.node.json',
    'vite.config.ts',
    'vitest.config.ts',
    '.gitignore',
    '.gitattributes',
  ];
  const found = [];
  for (const c of candidates) {
    if (exists(path.join(ROOT, c))) found.push(c);
  }
  const eslint = readDirSafe(ROOT).filter((e) => e.isFile() && /eslint\.config\.\w*/.test(e.name));
  found.push(...eslint.map((e) => e.name));
  const envExample = readDirSafe(ROOT).filter((e) => e.isFile() && /\.env\.?[\w.]*/.test(e.name));
  found.push(...envExample.map((e) => e.name));
  return found.sort();
}

function getGithubWorkflows() {
  const wfDir = path.join(ROOT, '.github', 'workflows');
  if (!exists(wfDir)) return [];
  return readDirSafe(wfDir)
    .filter((e) => e.isFile() && (e.name.endsWith('.yml') || e.name.endsWith('.yaml')))
    .map((e) => `.github/workflows/${e.name}`)
    .sort();
}

function getPackageScripts() {
  const pkgPath = path.join(ROOT, 'package.json');
  if (!exists(pkgPath)) return {};
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

function findTests(dir, base = '', acc = []) {
  const full = path.join(ROOT, dir);
  if (!exists(full)) return acc;
  for (const e of readDirSafe(full)) {
    const rel = path.join(base, e.name);
    if (e.isDirectory() && !IGNORE_DIRS.has(e.name)) {
      findTests(path.join(dir, e.name), rel, acc);
    } else if (e.isFile() && /\.test\.(ts|tsx|js|jsx)$/.test(e.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

function detectEntryPoints() {
  const candidates = [];
  if (exists(path.join(ROOT, 'package.json'))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      if (pkg.main) candidates.push({ path: pkg.main, role: 'main (compiled)' });
    } catch {}
  }
  if (exists(path.join(ROOT, 'index-desktop.html'))) {
    candidates.push({ path: 'index-desktop.html', role: 'HTML shell (likely renderer)' });
  }
  if (exists(path.join(ROOT, 'src', 'desktop', 'main.ts'))) {
    candidates.push({ path: 'src/desktop/main.ts', role: 'likely renderer entry (Vite)' });
  }
  if (exists(path.join(ROOT, 'electron', 'desktop', 'main.ts'))) {
    candidates.push({ path: 'electron/desktop/main.ts', role: 'likely Electron main process' });
  }
  if (exists(path.join(ROOT, 'electron', 'desktop', 'preload'))) {
    const preload = readDirSafe(path.join(ROOT, 'electron/desktop/preload')).find(
      (e) => e.isFile() && !e.name.endsWith('.test.')
    );
    if (preload) {
      candidates.push({ path: `electron/desktop/preload/${preload.name}`, role: 'likely preload script' });
    }
  }
  if (exists(path.join(ROOT, 'tools', 'arch-snapshot.mjs'))) {
    candidates.push({ path: 'tools/arch-snapshot.mjs', role: 'CLI/tool (arch snapshot)' });
  }
  return candidates;
}

function getSourceRoots() {
  const roots = ['src', 'electron', 'tools', 'scripts', 'tests', 'data', 'architecture', 'docs', 'archive'];
  return roots.filter((r) => exists(path.join(ROOT, r)));
}

function run() {
  const topLevel = getTopLevel();
  const srcSubsystems = getSubsystemFolders(path.join(ROOT, 'src'));
  const electronSubsystems = getSubsystemFolders(path.join(ROOT, 'electron'));
  const configs = findConfigs();
  const workflows = getGithubWorkflows();
  const scripts = getPackageScripts();
  const testFiles = findTests('src')
    .concat(findTests('electron'))
    .filter((_, i, arr) => arr.indexOf(_) === i)
    .sort();
  const entryPoints = detectEntryPoints();
  const sourceRoots = getSourceRoots();

  const lines = [
    '# Repo Scanner Summary',
    '',
    '## Top-Level Structure',
    ...topLevel.map((x) => `- ${x}`),
    '',
    '## Source Roots',
    ...sourceRoots.map((r) => `- ${r}/`),
    '',
    '## src Subsystems',
    ...(srcSubsystems.length ? srcSubsystems.map((s) => `- ${s}`) : ['(none detected)']),
    '',
    '## electron Subsystems',
    ...(electronSubsystems.length ? electronSubsystems.map((s) => `- ${s}`) : ['(none detected)']),
    '',
    '## Config and Build Surface',
    ...configs.map((c) => `- ${c}`),
    ...(workflows.length ? ['', 'GitHub workflows:'] : []),
    ...workflows.map((w) => `- ${w}`),
    '',
    '## Package Scripts',
    ...Object.entries(scripts).map(([k, v]) => `- \`${k}\`: ${v}`),
    '',
    '## Test Surface',
    `- Test files found: ${testFiles.length}`,
    '- Test pattern: colocated `*.test.ts` / `*.test.tsx`',
    '- Locations: src/, electron/',
    '',
    '## Likely Entry Points',
    ...entryPoints.map((e) => `- ${e.path} (${e.role})`),
    '',
    '## Plain-English Repo Shape',
    'This repository appears to be an Electron desktop application (Etsy AI Mentor) with a React/Vite renderer and a TypeScript backend. The src/ folder contains core domains: repair-engine (repair pipeline and contracts), governance (risk, zones, authority, security policy), heroes (AI orchestration), github (event intake, PR inspection, intake bridge), desktop (renderer UI), shared utilities, and operator playbooks. The electron/ folder holds the main process, desktop shell, IPC, and repair gates. Tests are colocated with source. Config uses Vite, Vitest, and TypeScript. Build outputs go to dist/ and dist-electron/.',
  ];

  return lines.join('\n');
}

const summary = run();
console.log(summary);

// Optional: write to artifacts if directory exists
const artifactsDir = path.join(ROOT, 'artifacts');
if (fs.existsSync(artifactsDir)) {
  fs.writeFileSync(path.join(artifactsDir, 'repo-scan-summary.md'), summary, 'utf-8');
}
