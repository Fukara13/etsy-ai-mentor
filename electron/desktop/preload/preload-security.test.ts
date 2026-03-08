/**
 * DC-10: Preload security contract tests.
 * Asserts bounded API; no generic invoke, no raw ipcRenderer.
 * Validates preload source code, not runtime.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Resolve preload.ts relative to this test file (preload-security.test.ts)
const preloadTsPath = join(__dirname, 'preload.ts')

function readPreload(): string {
  return readFileSync(preloadTsPath, 'utf-8')
}

describe('preload security contract', () => {
  it('preload exposes only desktopApi', () => {
    const content = readPreload()
    const exposeCalls = content.match(/contextBridge\.exposeInMainWorld\([^,]+/g) || []
    expect(exposeCalls.length).toBe(1)
    expect(content).toContain("exposeInMainWorld('desktopApi'")
  })

  it('preload has no generic invoke(channel, payload) pattern', () => {
    const content = readPreload()
    expect(content).not.toMatch(/invoke\s*\(\s*[a-zA-Z]+\s*,\s*[^)]+\s*\)/)
  })

  it('preload has no shell/exec/spawn/require/process exposure', () => {
    const content = readPreload()
    const forbidden = ['require(', 'process.', 'child_process', 'exec(', 'spawn(', 'shell:', 'fs.']
    for (const f of forbidden) {
      expect(content).not.toContain(f)
    }
  })

  it('preload read API includes expected methods', () => {
    const expectedReadMethods = [
      'getRepairRunView',
      'getStateMachineView',
      'getFailureTimelineView',
      'getGPTAnalysisView',
      'getRepairStrategyView',
      'getTelemetryView',
      'getDecisionView',
    ]
    const content = readPreload()
    for (const m of expectedReadMethods) {
      expect(content).toContain(m)
    }
    expect(content).toContain('getDecisionView')
  })

  it('preload system API includes getVersion (DC-12)', () => {
    const content = readPreload()
    expect(content).toContain('getVersion')
  })

  it('preload updates API is bounded (DC-12)', () => {
    const content = readPreload()
    expect(content).toContain('checkForUpdates')
    expect(content).toContain('installUpdate')
    expect(content).toContain('onUpdateAvailable')
    expect(content).toContain('onUpdateDownloaded')
  })
})
