/**
 * HM-1: HeroRegistry tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from './hero.registry'
import type { Hero, HeroContext } from './hero.types'

function createMockHero(name: string, role: Hero['role']): Hero {
  return {
    name,
    role,
    run: (ctx: HeroContext) => ({
      heroName: name,
      role,
      analysis: `Mock analysis for ${ctx.eventType}`,
      recommendations: [],
      confidence: 0.8,
    }),
  }
}

describe('HeroRegistry', () => {
  it('registers and retrieves hero by name', () => {
    const reg = new HeroRegistry()
    const hero = createMockHero('architect-mock', 'architect')
    reg.register(hero)
    expect(reg.getByName('architect-mock')).toBe(hero)
    expect(reg.getByName('unknown')).toBeUndefined()
  })

  it('filters heroes by role', () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect'))
    reg.register(createMockHero('repair-mock', 'repair'))
    reg.register(createMockHero('architect-2', 'architect'))
    const architects = reg.getByRole('architect')
    expect(architects).toHaveLength(2)
    expect(architects.map((h) => h.name)).toContain('architect-mock')
    expect(architects.map((h) => h.name)).toContain('architect-2')
    const repairs = reg.getByRole('repair')
    expect(repairs).toHaveLength(1)
    expect(repairs[0].name).toBe('repair-mock')
  })

  it('throws on duplicate name registration', () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect'))
    expect(() => reg.register(createMockHero('architect-mock', 'repair'))).toThrow(
      /Hero with this name is already registered/
    )
  })

  it('getAll returns a copy, not internal reference', () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect'))
    const a = reg.getAll()
    const b = reg.getAll()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
