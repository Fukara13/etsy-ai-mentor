/**
 * HM-4: HeroPipeline tests. Deterministic orchestration.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { HeroSelector } from '../selection/hero.selector'
import { HeroRuntime } from '../runtime/hero.runtime'
import { HeroPipeline } from './hero.pipeline'
import type { Hero, HeroContext } from '../core/hero.types'
import type { HeroExecutionContext } from '../runtime/hero.context'

function createMockHero(name: string, role: Hero['role']): Hero {
  return {
    name,
    role,
    run: (ctx: HeroContext) => ({
      heroName: name,
      role,
      analysis: `Analysis for ${ctx.eventType}`,
      recommendations: [],
      confidence: 0.8,
    }),
  }
}

function registerAllHeroes(reg: HeroRegistry): void {
  reg.register(createMockHero('ciFailureHero', 'repair'))
  reg.register(createMockHero('escalationHero', 'repair'))
  reg.register(createMockHero('reviewHero', 'architect'))
  reg.register(createMockHero('analysisHero', 'repair'))
}

function createPipeline(): {
  pipeline: HeroPipeline
  reg: HeroRegistry
} {
  const reg = new HeroRegistry()
  registerAllHeroes(reg)
  const executor = new HeroExecutor(reg)
  const selector = new HeroSelector(reg)
  const runtime = new HeroRuntime(reg, executor)
  const pipeline = new HeroPipeline(selector, runtime)
  return { pipeline, reg }
}

describe('HeroPipeline', () => {
  it('CI_FAILURE selects ciFailureHero and returns result', async () => {
    const { pipeline } = createPipeline()
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }
    const result = await pipeline.run('CI_FAILURE', ctx)
    expect(result.selectedHeroId).toBe('ciFailureHero')
    expect(result.event).toBe('CI_FAILURE')
    expect(result.executionResult.heroName).toBe('ciFailureHero')
    expect(result.executionResult.analysis).toContain('CI_FAILURE')
  })

  it('PR_OPENED selects reviewHero and returns result', async () => {
    const { pipeline } = createPipeline()
    const ctx: HeroExecutionContext = { event: 'PR_OPENED' }
    const result = await pipeline.run('PR_OPENED', ctx)
    expect(result.selectedHeroId).toBe('reviewHero')
    expect(result.event).toBe('PR_OPENED')
    expect(result.executionResult.heroName).toBe('reviewHero')
  })

  it('passes provided context into runtime', async () => {
    const { pipeline } = createPipeline()
    const ctx: HeroExecutionContext = {
      event: 'PR_OPENED',
      repository: 'my-repo',
      pullRequestNumber: 42,
    }
    const result = await pipeline.run('PR_OPENED', ctx)
    expect(result.executionResult.analysis).toBeDefined()
    expect(result.executionResult.contextEvent).toBe('PR_OPENED')
  })

  it('unknown event throws explicit error', async () => {
    const { pipeline } = createPipeline()
    const ctx: HeroExecutionContext = { event: 'PR_OPENED' }
    await expect(
      pipeline.run('UNKNOWN_EVENT' as 'PR_OPENED', ctx)
    ).rejects.toThrow(/Unknown hero event/)
  })

  it('unregistered selected hero throws explicit error', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('ciFailureHero', 'repair'))
    reg.register(createMockHero('escalationHero', 'repair'))
    reg.register(createMockHero('analysisHero', 'repair'))
    // reviewHero not registered
    const executor = new HeroExecutor(reg)
    const selector = new HeroSelector(reg)
    const runtime = new HeroRuntime(reg, executor)
    const pipeline = new HeroPipeline(selector, runtime)
    const ctx: HeroExecutionContext = { event: 'PR_OPENED' }
    await expect(pipeline.run('PR_OPENED', ctx)).rejects.toThrow(
      /Selected hero is not registered/
    )
  })

  it('no fallback: same event always yields same hero', async () => {
    const { pipeline } = createPipeline()
    const ctx: HeroExecutionContext = { event: 'PR_UPDATED' }
    const a = await pipeline.run('PR_UPDATED', ctx)
    const b = await pipeline.run('PR_UPDATED', ctx)
    expect(a.selectedHeroId).toBe(b.selectedHeroId)
    expect(a.selectedHeroId).toBe('reviewHero')
  })
})
