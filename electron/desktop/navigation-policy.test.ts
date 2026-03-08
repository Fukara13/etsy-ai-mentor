/**
 * DC-10: Navigation policy tests.
 * Deterministic; covers dev vs prod, localhost vs 127.0.0.1, external blocking.
 */

import { describe, it, expect } from 'vitest'
import { isAllowedAppNavigation } from './navigation-policy'

describe('isAllowedAppNavigation', () => {
  describe('development (unpackaged)', () => {
    const isPackaged = false

    it('allows localhost app origin', () => {
      expect(isAllowedAppNavigation('http://localhost:5173/index-desktop.html', isPackaged)).toBe(true)
      expect(isAllowedAppNavigation('http://localhost:5173/', isPackaged)).toBe(true)
      expect(isAllowedAppNavigation('http://localhost:5173', isPackaged)).toBe(true)
    })

    it('allows 127.0.0.1 app origin', () => {
      expect(isAllowedAppNavigation('http://127.0.0.1:5173/index-desktop.html', isPackaged)).toBe(true)
      expect(isAllowedAppNavigation('http://127.0.0.1:5173/', isPackaged)).toBe(true)
    })

    it('blocks external http origins', () => {
      expect(isAllowedAppNavigation('http://example.com', isPackaged)).toBe(false)
      expect(isAllowedAppNavigation('http://evil.com:5173', isPackaged)).toBe(false)
      expect(isAllowedAppNavigation('https://localhost:5173', isPackaged)).toBe(false)
    })

    it('blocks external https origins', () => {
      expect(isAllowedAppNavigation('https://example.com', isPackaged)).toBe(false)
    })
  })

  describe('production (packaged)', () => {
    const isPackaged = true

    it('allows file protocol', () => {
      expect(isAllowedAppNavigation('file:///path/to/dist/index-desktop.html', isPackaged)).toBe(true)
      expect(isAllowedAppNavigation('file:///C:/app/dist/index-desktop.html', isPackaged)).toBe(true)
    })

    it('blocks external http origins', () => {
      expect(isAllowedAppNavigation('http://localhost:5173', isPackaged)).toBe(false)
      expect(isAllowedAppNavigation('http://example.com', isPackaged)).toBe(false)
    })

    it('blocks external https origins', () => {
      expect(isAllowedAppNavigation('https://example.com', isPackaged)).toBe(false)
    })
  })
})
