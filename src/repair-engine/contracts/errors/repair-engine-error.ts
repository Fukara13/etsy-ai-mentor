import type { RepairEngineErrorCode } from './repair-engine-error-code';

export class RepairEngineError extends Error {
  readonly code: RepairEngineErrorCode;

  constructor(code: RepairEngineErrorCode, message: string) {
    super(message);
    this.name = 'RepairEngineError';
    this.code = code;
    Object.setPrototypeOf(this, RepairEngineError.prototype);
    Object.freeze(this);
  }
}
