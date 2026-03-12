import { ErrorType } from './error-type'

export interface ErrorClassificationInput {
  readonly message: string
}

export function classifyError(input: ErrorClassificationInput): ErrorType {
  const msg = input.message.toLowerCase()

  if (msg.includes('module not found')) return ErrorType.MODULE_NOT_FOUND

  if (msg.includes('cannot find module')) return ErrorType.MODULE_NOT_FOUND

  if (msg.includes('dependency')) return ErrorType.DEPENDENCY_ERROR

  if (msg.includes('test failed')) return ErrorType.TEST_FAILURE

  if (msg.includes('build failed')) return ErrorType.BUILD_FAILURE

  if (msg.includes('type error')) return ErrorType.TYPE_ERROR

  return ErrorType.UNKNOWN
}

