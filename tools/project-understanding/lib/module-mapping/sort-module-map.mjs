/**
 * Stable sorting for module map output.
 */

export function sortModules(modules) {
  return [...modules].sort((a, b) => {
    const id = (a.id || '').localeCompare(b.id || '');
    return id !== 0 ? id : (a.name || '').localeCompare(b.name || '');
  });
}

export function sortFileMappings(mappings) {
  return [...mappings].sort((a, b) =>
    (a.filePath || '').localeCompare(b.filePath || '')
  );
}

export function sortCrossModuleEdges(edges) {
  return [...edges].sort((a, b) => {
    const from = (a.fromModuleId || '').localeCompare(b.fromModuleId || '');
    return from !== 0 ? from : (a.toModuleId || '').localeCompare(b.toModuleId || '');
  });
}

export function sortUnassigned(files) {
  return [...files].sort();
}
