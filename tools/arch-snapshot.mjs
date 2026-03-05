#!/usr/bin/env node

/**
 * Architecture Snapshot Tool v1
 * Generates architecture documentation from codebase analysis.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const OUTPUT_DIR = path.join(ROOT_DIR, 'architecture', 'snapshot-artifacts');
const SNAPSHOT_FILE = path.join(ROOT_DIR, 'architecture', 'snapshot-v1.md');

// Ensure output directories exist
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Generate file tree (max 4 levels deep)
function generateFileTree() {
  const output = [];
  const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'dist-electron', '.cursor']);
  const ignoreFiles = new Set(['.DS_Store', 'Thumbs.db']);

  function walk(dir, prefix = '', level = 0) {
    if (level >= 4) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => {
          if (entry.isDirectory() && ignoreDirs.has(entry.name)) return false;
          if (entry.isFile() && ignoreFiles.has(entry.name)) return false;
          return true;
        })
        .sort((a, b) => {
          if (a.isDirectory() !== b.isDirectory()) {
            return a.isDirectory() ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

      entries.forEach((entry, index) => {
        const isLast = index === entries.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        output.push(prefix + connector + entry.name);
        
        if (entry.isDirectory()) {
          const nextPrefix = prefix + (isLast ? '    ' : '│   ');
          walk(path.join(dir, entry.name), nextPrefix, level + 1);
        }
      });
    } catch (err) {
      // Skip directories we can't read
    }
  }

  walk(ROOT_DIR);
  return output.join('\n');
}

// Find all IPC handlers
function findIpcHandlers() {
  const handlers = [];
  const mainTsPath = path.join(ROOT_DIR, 'electron', 'main.ts');
  
  if (!fs.existsSync(mainTsPath)) {
    return 'electron/main.ts not found';
  }

  const content = fs.readFileSync(mainTsPath, 'utf-8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();
    
    // Match ipcMain.handle('channel', ...) or ipcMain.on('channel', ...)
    const handleMatch = trimmed.match(/ipcMain\.handle\s*\(\s*['"]([^'"]+)['"]/);
    const onMatch = trimmed.match(/ipcMain\.on\s*\(\s*['"]([^'"]+)['"]/);
    
    if (handleMatch) {
      const channel = handleMatch[1];
      // Try to extract purpose from comments above (look back up to 5 lines)
      let purpose = 'No description';
      for (let i = index - 1; i >= 0 && i >= index - 5; i--) {
        const commentMatch = lines[i].match(/\/\/\s*(.+)/);
        if (commentMatch && !commentMatch[1].includes('Gate') && !commentMatch[1].includes('guard')) {
          purpose = commentMatch[1].trim();
          break;
        }
      }
      // If no comment found, try to infer from channel name
      if (purpose === 'No description') {
        if (channel.includes('gate7')) purpose = 'Gate 7: BrowserView listing capture';
        else if (channel.includes('capture')) purpose = 'Capture management';
        else if (channel.includes('session')) purpose = 'Session management';
        else if (channel.includes('competitor')) purpose = 'Competitor analysis';
        else if (channel.includes('nav')) purpose = 'BrowserView navigation';
        else if (channel.includes('browser')) purpose = 'BrowserView control';
        else if (channel.includes('app')) purpose = 'App view management';
      }
      handlers.push({
        channel,
        type: 'handle',
        line: lineNum,
        purpose,
      });
    }
    
    if (onMatch) {
      const channel = onMatch[1];
      let purpose = 'No description';
      for (let i = index - 1; i >= 0 && i >= index - 5; i--) {
        const commentMatch = lines[i].match(/\/\/\s*(.+)/);
        if (commentMatch && !commentMatch[1].includes('Gate') && !commentMatch[1].includes('guard')) {
          purpose = commentMatch[1].trim();
          break;
        }
      }
      if (purpose === 'No description') {
        if (channel.includes('gate7')) purpose = 'Gate 7: Close BrowserView';
        else if (channel.includes('app')) purpose = 'App view change';
        else if (channel.includes('browser')) purpose = 'BrowserView bounds update';
      }
      handlers.push({
        channel,
        type: 'on',
        line: lineNum,
        purpose,
      });
    }
  });
  
  if (handlers.length === 0) {
    return 'No IPC handlers found';
  }
  
  return handlers.map(h => 
    `${h.type === 'handle' ? 'HANDLE' : 'ON'} | ${h.channel} | electron/main.ts:${h.line} | ${h.purpose}`
  ).join('\n');
}

// Extract gate information
function extractGates() {
  const registryPath = path.join(ROOT_DIR, 'electron', 'gates', 'registry.ts');
  const storePath = path.join(ROOT_DIR, 'electron', 'gates', 'store.ts');
  const persistencePath = path.join(ROOT_DIR, 'electron', 'gates', 'persistence.ts');
  
  const gates = [];
  
  // Read registry - parse each gate definition
  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, 'utf-8');
    // Match gate definitions more flexibly
    const gateBlockRegex = /(gate\d+(?:_\d+)?):\s*\{([^}]+)\}/g;
    let match;
    while ((match = gateBlockRegex.exec(content)) !== null) {
      const gateId = match[1];
      const block = match[2];
      const idMatch = block.match(/id:\s*['"]([^'"]+)['"]/);
      const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
      const descMatch = block.match(/description:\s*['"]([^'"]+)['"]/);
      const depsMatch = block.match(/deps:\s*\[([^\]]+)\]/);
      
      gates.push({
        id: idMatch ? idMatch[1] : gateId,
        title: titleMatch ? titleMatch[1] : gateId,
        description: descMatch ? descMatch[1] : 'No description',
        deps: depsMatch ? depsMatch[1].split(',').map(d => d.trim().replace(/['"]/g, '')) : [],
      });
    }
  }
  
  // Read store for default statuses
  const defaultStatuses = {};
  if (fs.existsSync(storePath)) {
    const content = fs.readFileSync(storePath, 'utf-8');
    const statusMatches = content.matchAll(/(gate\d+(?:_\d+)?):\s*['"](LOCKED|OPEN|PASS)['"]/g);
    for (const match of statusMatches) {
      defaultStatuses[match[1]] = match[2];
    }
  }
  
  let output = 'Gate Registry:\n';
  output += '='.repeat(60) + '\n';
  gates.forEach(gate => {
    output += `\n${gate.id} (${gate.title})\n`;
    output += `  Description: ${gate.description}\n`;
    output += `  Default Status: ${defaultStatuses[gate.id] || 'LOCKED'}\n`;
    if (gate.deps && gate.deps.length > 0) {
      output += `  Dependencies: ${gate.deps.join(', ')}\n`;
    }
  });
  
  output += '\n\nGate Files:\n';
  output += '='.repeat(60) + '\n';
  output += `- Registry: electron/gates/registry.ts\n`;
  output += `- Store: electron/gates/store.ts\n`;
  output += `- Persistence: electron/gates/persistence.ts\n`;
  
  // Check for dev seed parsing
  if (fs.existsSync(persistencePath)) {
    const content = fs.readFileSync(persistencePath, 'utf-8');
    if (content.includes('GATE_DEV_SEED')) {
      output += `\nDev Seed: Parsed from process.env.GATE_DEV_SEED in persistence.ts\n`;
      output += `  Format: "gate10=PASS,gate11=OPEN" (comma or semicolon separated)\n`;
    }
  }
  
  return output;
}

// Extract package.json scripts
function extractPackageScripts() {
  const packagePath = path.join(ROOT_DIR, 'package.json');
  if (!fs.existsSync(packagePath)) {
    return 'package.json not found';
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const scripts = pkg.scripts || {};
  
  return Object.entries(scripts)
    .map(([name, cmd]) => `${name}: ${cmd}`)
    .join('\n');
}

// Generate main snapshot markdown
function generateSnapshotMd(fileTree, ipcHandlers, gatesSummary, packageScripts) {
  const viteConfigPath = path.join(ROOT_DIR, 'vite.config.ts');
  let devPort = '5173';
  if (fs.existsSync(viteConfigPath)) {
    const viteContent = fs.readFileSync(viteConfigPath, 'utf-8');
    const portMatch = viteContent.match(/port:\s*(\d+)/);
    if (portMatch) {
      devPort = portMatch[1];
    }
  }
  
  const mainTsPath = path.join(ROOT_DIR, 'electron', 'main.ts');
  let bootFlow = [];
  if (fs.existsSync(mainTsPath)) {
    const content = fs.readFileSync(mainTsPath, 'utf-8');
    if (content.includes('app.whenReady()')) {
      bootFlow.push('app.whenReady() triggers');
    }
    if (content.includes('initDB()')) {
      bootFlow.push('initDB() initializes database');
    }
    if (content.includes('loadGateState()')) {
      bootFlow.push('loadGateState() loads persisted gate state');
    }
    if (content.includes('gateState.gate9 !== \'PASS\'')) {
      bootFlow.push('Gate 9 boot check: if not PASS, app.quit()');
    }
    if (content.includes('createWindow()')) {
      bootFlow.push('createWindow() creates BrowserWindow');
    }
    if (content.includes('localhost:' + devPort)) {
      bootFlow.push(`In dev: loadURL('http://localhost:${devPort}')`);
    }
    if (content.includes('registerIpcHandlers()')) {
      bootFlow.push('registerIpcHandlers() registers all IPC channels');
    }
  }
  
  return `# Architecture Snapshot v1

Generated: ${new Date().toISOString()}

## A) Project Overview (Proje Genel)

**Stack:** Electron + React + Vite

**Evidence:**
- \`package.json\`: \`electron\`, \`react\`, \`react-dom\`, \`vite\` dependencies
- \`electron/main.ts\`: Electron main process entry point
- \`src/\`: React renderer source code
- \`vite.config.ts\`: Vite configuration

**Dev Port:** ${devPort}
- Defined in: \`vite.config.ts\` (\`server.port: ${devPort}\`)
- Also referenced in: \`package.json\` script \`dev:renderer\` (\`--port ${devPort}\`)
- Loaded in: \`electron/main.ts\` (\`const devUrl = 'http://localhost:${devPort}'\`)

## B) File Tree (Dosya Ağacı)

\`\`\`
${fileTree}
\`\`\`

## C) Gate System (Gate Sistemi)

**Gate Registry:** \`electron/gates/registry.ts\`
- Defines \`GateId\`, \`GateStatus\`, \`GateDef\`, and \`GATE_REGISTRY\`

**Gate Store:** \`electron/gates/store.ts\`
- Defines \`GateState\` type and \`getDefaultGateState()\`
- Default state is dynamically derived from \`GATE_REGISTRY\` and \`DEFAULT_STATUSES\`

**Persistence:** \`electron/gates/persistence.ts\`
- \`loadGateState()\`: Loads from settings DB (\`gates.state.v1\` key), sanitizes, merges with defaults, applies dev seed
- \`saveGateState(state)\`: Saves to settings DB
- Dev seed parsing: \`process.env.GATE_DEV_SEED\` parsed in \`applyDevSeed()\` (format: \`gate10=PASS,gate11=OPEN\`)

**Gate List:**

${gatesSummary.split('\n').map(l => l.trim() ? l : '').filter(Boolean).join('\n')}

## D) IPC Map (IPC Haritası)

All IPC handlers are registered in \`electron/main.ts\` via \`registerIpcHandlers()\`.

| Type | Channel | Location | Purpose |
|------|---------|----------|---------|
${ipcHandlers.split('\n').filter(l => l.trim()).map(l => {
  const parts = l.split(' | ');
  if (parts.length >= 4) {
    return `| ${parts[0]} | ${parts[1]} | ${parts[2]} | ${parts[3]} |`;
  }
  return l;
}).join('\n')}

**Gate Enforcement:**
- \`session:create\`: Guarded at \`electron/main.ts:300-305\` (checks \`gateState.gate10\`)
- \`capture:create\`: Guarded at \`electron/main.ts:481-486\` (checks \`gateState.gate10\`)
- \`capture:analyze\`: Guarded at \`electron/main.ts:621-626\` (checks \`gateState.gate10\`)

## E) Boot Flow (Başlatma Akışı)

\`electron/main.ts\` boot sequence:

${bootFlow.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## F) Runtime Configuration (Çalışma Ayarları)

**Environment Variables:**
- \`GATE_DEV_SEED\`: Override gate states in development (e.g., \`gate10=PASS,gate11=OPEN\`)
  - Parsed in: \`electron/gates/persistence.ts\` → \`applyDevSeed()\`
  - Only active when \`NODE_ENV !== 'production'\`

**Package Scripts:**

\`\`\`
${packageScripts}
\`\`\`

## G) Known Risks / TODO (Riskler / Yapılacaklar)

1. **Gate State Persistence:** Gate state is persisted in SQLite settings DB, but there's no migration mechanism if the gate registry changes (e.g., gates removed/renamed).

2. **IPC Handler Registration:** All handlers are registered in a single function (\`registerIpcHandlers()\`), which could become unwieldy as the app grows.

3. **BrowserView Lifecycle:** Gate 7 BrowserView management relies on \`gate7Active\` flag; potential race conditions if multiple views are attempted.

4. **Dev Seed Parsing:** Dev seed parser tolerates various formats but doesn't validate gate dependencies (e.g., setting \`gate11=OPEN\` without \`gate10=PASS\`).

5. **Error Handling:** Some IPC handlers return \`null\` on error without structured error responses, making error tracking difficult.

---

*Generated by tools/arch-snapshot.mjs*
`;
}

// Main execution
try {
  console.log('Generating architecture snapshot...');
  
  ensureDir(OUTPUT_DIR);
  ensureDir(path.dirname(SNAPSHOT_FILE));
  
  console.log('1. Generating file-tree.txt...');
  const fileTree = generateFileTree();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'file-tree.txt'), fileTree);
  
  console.log('2. Generating ipc-handlers.txt...');
  const ipcHandlers = findIpcHandlers();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'ipc-handlers.txt'), ipcHandlers);
  
  console.log('3. Generating gates-summary.txt...');
  const gatesSummary = extractGates();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'gates-summary.txt'), gatesSummary);
  
  console.log('4. Generating package-scripts.txt...');
  const packageScripts = extractPackageScripts();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'package-scripts.txt'), packageScripts);
  
  console.log('5. Generating snapshot-v1.md...');
  const snapshotMd = generateSnapshotMd(fileTree, ipcHandlers, gatesSummary, packageScripts);
  fs.writeFileSync(SNAPSHOT_FILE, snapshotMd);
  
  console.log('\n✓ Architecture snapshot generated successfully!');
  console.log(`  - ${SNAPSHOT_FILE}`);
  console.log(`  - ${OUTPUT_DIR}/`);
} catch (error) {
  console.error('Error generating snapshot:', error.message);
  console.error(error.stack);
  process.exit(1);
}
