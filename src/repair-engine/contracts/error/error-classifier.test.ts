import { describe, it, expect } from 'vitest'

import { classifyError } from './error-classifier'
import { ErrorType } from './error-type'

describe('error classifier', () => {
  it('detects module not found', () => {
    const result = classifyError({
      message: 'Module not found: react',
    })

    expect(result).toBe(ErrorType.MODULE_NOT_FOUND)
  })

  it('detects dependency error', () => {
    const result = classifyError({
      message: 'dependency resolution failed',
    })

    expect(result).toBe(ErrorType.DEPENDENCY_ERROR)
  })

  it('detects test failure', () => {
    const result = classifyError({
      message: 'test failed',
    })

    expect(result).toBe(ErrorType.TEST_FAILURE)
  })

  it('falls back to unknown', () => {
    const result = classifyError({
      message: 'something weird happened',
    })

    expect(result).toBe(ErrorType.UNKNOWN)
  })
})

