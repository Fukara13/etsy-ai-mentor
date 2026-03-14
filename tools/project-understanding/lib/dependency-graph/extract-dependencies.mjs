/**
 * Extract dependency specifiers from source text.
 * Conservative regex-based extraction. No full parsing.
 */

/**
 * Match string literals in import/require: 'x' or "x"
 */
function extractStringLiterals(text) {
  const results = [];
  // Match '...' or "..." - avoid escaped quotes in middle
  const re = /['"]([^'"]*)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1]);
  }
  return results;
}

/**
 * Extract import specifiers: import x from 'pkg' | import { a } from "./mod" | import "./side"
 */
function extractImportSpecifiers(text) {
  const results = [];
  // import ... from 'x' or "x"
  const fromRe = /import\s+(?:[\w{}\s,*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  let m;
  while ((m = fromRe.exec(text)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/**
 * Extract export from specifiers: export * from 'x' | export { a } from "./y"
 */
function extractExportFromSpecifiers(text) {
  const results = [];
  const re = /export\s+(?:\*\s+|\{[^}]*\}\s+)?from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/**
 * Extract require("x") - only literal string.
 */
function extractRequireSpecifiers(text) {
  const results = [];
  const re = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/**
 * Extract dynamic import('x') - only literal string.
 */
function extractDynamicImportSpecifiers(text) {
  const results = [];
  const re = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    results.push(m[1].trim());
  }
  return results;
}

/**
 * Extract all dependency specifiers from file content.
 * Returns array of raw specifiers (no dedup at this layer).
 */
export function extractDependencies(fileContent) {
  if (typeof fileContent !== 'string') return [];
  const all = [
    ...extractImportSpecifiers(fileContent),
    ...extractExportFromSpecifiers(fileContent),
    ...extractRequireSpecifiers(fileContent),
    ...extractDynamicImportSpecifiers(fileContent),
  ];
  return all;
}
