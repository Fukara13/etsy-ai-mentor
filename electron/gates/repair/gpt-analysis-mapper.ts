/**
 * Gate-S29: GPT prompt mapper — Pure conversion of repair context to deterministic prompt.
 */

import type { GPTAnalysisInput } from './gpt-analysis.types';

const MAX_LOG_CHARS = 1500;

/** Strip patterns that may look like secrets (redact, do not remove structure). */
function stripPotentialSecrets(text: string): string {
  return text
    .replace(/\b(?:sk-[a-zA-Z0-9]{20,})/g, '[REDACTED]')
    .replace(/\b(?:ghp_[a-zA-Z0-9]{36})/g, '[REDACTED]')
    .replace(/\b(?:AKIA[0-9A-Z]{16})/g, '[REDACTED]')
    .replace(/\b(?:-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----)/gm, '[REDACTED]');
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '...[truncated]';
}

export function mapRepairContextToPrompt(input: GPTAnalysisInput): string {
  const logExcerpt = input.logExcerpt != null && input.logExcerpt !== ''
    ? truncate(stripPotentialSecrets(input.logExcerpt), MAX_LOG_CHARS)
    : '(none provided)';
  const failingStep = input.failingStep != null && input.failingStep !== ''
    ? input.failingStep
    : '(not specified)';
  const governanceFlags =
    input.governanceFlags != null && input.governanceFlags.length > 0
      ? input.governanceFlags.join(', ')
      : '(none)';

  return `You are a diagnostic assistant analyzing CI failures.

You do NOT execute fixes.
You do NOT modify repositories.

Your task is to produce structured diagnostic hypotheses.

Failure summary:
${input.failureSummary.trim()}

Failing step:
${failingStep}

Repair state:
${input.repairState}

Retry count:
${input.retryCount}

Governance flags:
${governanceFlags}

Log excerpt:
${logExcerpt}

Respond with a JSON object only, no markdown, with keys: summary (string), hypotheses (array of strings), confidence (number 0-1), recommendedAction (string, optional), riskFlags (array of strings, optional), requiresHuman (boolean).`;
}
