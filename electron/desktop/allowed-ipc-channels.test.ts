/**
 * DC-10: IPC channel allow-list tests.
 * Asserts read-only boundary; no mutation channels.
 */

import { describe, it, expect } from 'vitest'
import { DESKTOP_ALLOWED_IPC_CHANNELS } from './allowed-ipc-channels'
import { IPC_CHANNELS } from '../ipc/ipc-channels'

describe('allowed-ipc-channels', () => {
  it('all channels are read-focused (no write/mutation naming)', () => {
    const forbidden = [
      ':write:',
      ':mutate:',
      ':execute:',
      ':trigger:',
      ':merge:',
      ':push:',
      ':patch:',
      ':run:',  // run as channel segment (e.g. run:command), not "RepairRun"
    ]
    for (const ch of DESKTOP_ALLOWED_IPC_CHANNELS) {
      const lower = ch.toLowerCase()
      for (const f of forbidden) {
        expect(lower).not.toContain(f)
      }
    }
  })

  it('all channels use desktop prefix', () => {
    for (const ch of DESKTOP_ALLOWED_IPC_CHANNELS) {
      expect(ch.startsWith('desktop:')).toBe(true)
    }
  })

  it('IPC_CHANNELS match allow-list exactly', () => {
    const registered = Object.values(IPC_CHANNELS)
    const allowed = [...DESKTOP_ALLOWED_IPC_CHANNELS]
    expect(registered.sort()).toEqual(allowed.sort())
  })

  it('no generic invoke or execute channel exists', () => {
    const hasGeneric = DESKTOP_ALLOWED_IPC_CHANNELS.some(
      (ch) => ch.includes(':invoke') || ch.includes(':execute'),
    )
    expect(hasGeneric).toBe(false)
  })
})
