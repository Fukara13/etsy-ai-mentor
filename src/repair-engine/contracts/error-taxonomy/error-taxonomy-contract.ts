import type { ErrorCategory } from './error-category';
import type { ErrorType } from './error-type';
import type { ErrorCode } from './error-code';
import type { ErrorSeverity } from './error-severity';
import type { ErrorRecoverability } from './error-recoverability';

export interface ErrorTaxonomyContract {
  readonly category: ErrorCategory;
  readonly type: ErrorType;
  readonly code: ErrorCode;
  readonly severity: ErrorSeverity;
  readonly recoverability: ErrorRecoverability;
  readonly message: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

