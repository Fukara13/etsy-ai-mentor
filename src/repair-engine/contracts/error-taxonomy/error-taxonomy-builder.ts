import type { ErrorCategory } from './error-category';
import type { ErrorType } from './error-type';
import type { ErrorCode } from './error-code';
import type { ErrorSeverity } from './error-severity';
import type { ErrorRecoverability } from './error-recoverability';
import type { ErrorTaxonomyContract } from './error-taxonomy-contract';
import { deepFreeze } from './deep-freeze';

export interface BuildErrorTaxonomyInput {
  readonly category: ErrorCategory;
  readonly type: ErrorType;
  readonly code: ErrorCode;
  readonly severity?: ErrorSeverity;
  readonly recoverability?: ErrorRecoverability;
  readonly message: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

function normalizeMessage(message: string): string {
  const normalized = message.trim();

  if (normalized.length === 0) {
    throw new Error('ErrorTaxonomyContract requires non-empty message.');
  }

  return normalized;
}

export function buildErrorTaxonomyContract(
  input: BuildErrorTaxonomyInput
): ErrorTaxonomyContract {
  const message = normalizeMessage(input.message);
  const severity: ErrorSeverity = input.severity ?? 'medium';
  const recoverability: ErrorRecoverability = input.recoverability ?? 'unknown';

  const rawMetadata =
    input.metadata !== undefined ? { ...(input.metadata as Record<string, unknown>) } : {};

  const metadata = deepFreeze(rawMetadata) as Readonly<Record<string, unknown>>;

  const contract: ErrorTaxonomyContract = {
    category: input.category,
    type: input.type,
    code: input.code,
    severity,
    recoverability,
    message,
    metadata,
  };

  return Object.freeze(contract);
}

