/**
 * Infer infrastructure signals from repo-scan.
 * Pure function, deterministic, no LLM.
 * Falls back to false when repo-scan is missing or lacks fields.
 */

/**
 * @param {object} repoScan - .ai-devos/repo-scan.json (optional)
 * @param {object} context - optional { fsSignals: { hasGitHubWorkflows?: boolean } }
 * @returns {{ hasGitHubWorkflows: boolean, hasDocker: boolean, hasLint: boolean, hasFormatter: boolean }}
 */
export function inferInfrastructure(repoScan, context) {
  const repo = repoScan || {};
  const ctx = context || {};
  const workflows = repo.workflows || repo.githubWorkflows || [];
  const configs = repo.configs || repo.configFiles || [];

  const hasGitHubWorkflows =
    ctx.fsSignals?.hasGitHubWorkflows === true ||
    (Array.isArray(workflows) && workflows.length > 0);

  const hasDocker =
    repo.hasDocker === true ||
    (Array.isArray(configs) &&
      configs.some(
        (c) =>
          typeof c === 'string' &&
          (c.includes('Dockerfile') || c.includes('docker-compose') || c.includes('.docker'))
      ));

  const lintPatterns = ['eslint', 'biome', 'oxlint'];
  const hasLint =
    repo.hasLint === true ||
    (Array.isArray(configs) &&
      configs.some(
        (c) =>
          typeof c === 'string' &&
          lintPatterns.some((p) => c.toLowerCase().includes(p))
      ));

  const formatterPatterns = ['prettier', 'biome', 'dprint'];
  const hasFormatter =
    repo.hasFormatter === true ||
    (Array.isArray(configs) &&
      configs.some(
        (c) =>
          typeof c === 'string' &&
          formatterPatterns.some((p) => c.toLowerCase().includes(p))
      ));

  return {
    hasGitHubWorkflows,
    hasDocker,
    hasLint,
    hasFormatter,
  };
}
