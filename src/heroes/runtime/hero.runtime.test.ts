/**
 * HM-2: HeroRuntime tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRuntime } from './hero.runtime'
import type { Hero, HeroContext } from '../core/hero.types'
import type { HeroExecutionContext } from './hero.context'

function createFakeHero(name: string, role: Hero['role']): Hero {
  return {
    name,
    role,
    run: (ctx: HeroContext) => ({
      heroName: name,
      role,
      analysis: `Analysis for ${ctx.eventType}`,
      recommendations: [
        { title: 'R1', detail: 'Detail 1', priority: 'high' },
        { title: 'R2', detail: 'Detail 2', priority: 'low' },
      ],
      confidence: 0.85,
    }),
  }
}

describe('HeroRuntime', () => {
  it('runs a registered hero successfully', async () => {
    const reg = new HeroRegistry()
    reg.register(createFakeHero('architect-mock', 'architect'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'pr_opened' }

    const result = await runtime.run('architect-mock', ctx)

    expect(result.heroName).toBe('architect-mock')
    expect(result.role).toBe('architect')
    expect(result.analysis).toBe('Analysis for pr_opened')
    expect(result.confidence).toBe(0.85)
  })

  it('includes context.event in result', async () => {
    const reg = new HeroRegistry()
    reg.register(createFakeHero('repair-mock', 'repair'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'workflow_failed' }

    const result = await runtime.run('repair-mock', ctx)

    expect(result.contextEvent).toBe('workflow_failed')
  })

  it('returns normalized recommendations and confidence', async () => {
    const reg = new HeroRegistry()
    reg.register(createFakeHero('architect-mock', 'architect'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'test' }

    const result = await runtime.run('architect-mock', ctx)

    expect(result.recommendations).toEqual(['R1', 'R2'])
    expect(result.confidence).toBe(0.85)
  })

  it('throws when hero is not registered', async () => {
    const reg = new HeroRegistry()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'test' }

    await expect(runtime.run('unknown', ctx)).rejects.toThrow(/Hero not found/)
  })

  it('preserves hero identity normalization through executor', async () => {
    const reg = new HeroRegistry()
    reg.register({
      name: 'repair-mock',
      role: 'repair',
      run: () => ({
        heroName: 'wrong',
        role: 'architect' as const,
        analysis: 'Ok',
        recommendations: [],
        confidence: 0.5,
      }),
    })
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'test' }

    const result = await runtime.run('repair-mock', ctx)

    expect(result.heroName).toBe('repair-mock')
    expect(result.role).toBe('repair')
  })

  it('does not require optional context fields', async () => {
    const reg = new HeroRegistry()
    reg.register(createFakeHero('architect-mock', 'architect'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const ctx: HeroExecutionContext = { event: 'minimal' }

    const result = await runtime.run('architect-mock', ctx)

    expect(result).toBeDefined()
    expect(result.contextEvent).toBe('minimal')
  })
})
