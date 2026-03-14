/**
 * Infer architectural layers from module-map.
 * Maps module kind/path to layer: domain | infrastructure | interface | test | unknown.
 * Pure function, deterministic, no LLM.
 */

const KIND_TO_ROLE = {
  feature: 'domain',
  shared: 'infrastructure',
  entrypoint: 'interface',
  unknown: 'unknown',
};

const LAYER_SIGNALS = {
  domain: ['src/', 'domain', 'core', 'heroes', 'governance', 'github', 'operator'],
  infrastructure: ['shared', 'gates', 'repair-engine', 'lib', 'db', 'storage'],
  interface: ['desktop', 'renderer', 'preload', 'ipc', 'entrypoint', 'tools/'],
  test: ['test', '.test.', 'spec.', '__tests__', 'e2e'],
};

/**
 * Classify module role from module name and kind.
 * @param {string} moduleName - e.g. "src/heroes"
 * @param {string} kind - e.g. "feature", "entrypoint", "shared"
 */
function inferRoleFromKind(moduleName, kind) {
  const role = KIND_TO_ROLE[kind];
  if (role && role !== 'unknown') return role;
  return inferRoleFromPath(moduleName);
}

/**
 * Infer role from path when kind is unknown.
 */
function inferRoleFromPath(moduleName) {
  const p = (moduleName || '').toLowerCase();
  for (const [layer, patterns] of Object.entries(LAYER_SIGNALS)) {
    for (const pat of patterns) {
      if (p.includes(pat)) return layer;
    }
  }
  if (/\.test\.|\.spec\.|__tests__|e2e/.test(p)) return 'test';
  return 'unknown';
}

/**
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @returns {{ detectedLayers: string[], layerAssignments: { module: string, layer: string }[] }}
 */
export function inferLayers(moduleMap) {
  const modules = moduleMap?.modules || [];
  const layerSet = new Set();
  const assignments = [];

  for (const m of modules) {
    const name = m.name;
    const kind = m.kind || 'unknown';
    const role = inferRoleFromKind(name, kind);
    layerSet.add(role);
    assignments.push({ module: name, layer: role });
  }

  const detectedLayers = [...layerSet].sort((a, b) => a.localeCompare(b));
  assignments.sort((a, b) => {
    const cmp = a.module.localeCompare(b.module);
    return cmp !== 0 ? cmp : a.layer.localeCompare(b.layer);
  });

  return {
    detectedLayers,
    layerAssignments: assignments,
  };
}
