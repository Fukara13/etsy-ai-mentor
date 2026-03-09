/**
 * HM-5: Registry integration with real heroes.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroSelector } from '../selection/hero.selector'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRuntime } from '../runtime/hero.runtime'
import { HeroPipeline } from '../pipeline/hero.pipeline'
import { registerAllHeroes } from './index'

describe('Registry integration', () => {
  it('selector -> runtime -> pipeline path works with real heroes', async () => {
    const reg = new HeroRegistry()
    registerAllHeroes(reg)
    const executor = new HeroExecutor(reg)
    const selector = new HeroSelector(reg)
    const runtime = new HeroRuntime(reg, executor)
    const pipeline = new HeroPipeline(selector, runtime)

    const result = await pipeline.run('CI_FAILURE', { event: 'CI_FAILURE' })

    expect(result.selectedHeroId).toBe('ciFailureHero')
    expect(result.executionResult.heroName).toBe('ciFailureHero')
    expect(result.executionResult.analysis).toBeTruthy()
    expect(result.executionResult.advice).toBeDefined()
    expect(result.executionResult.advice?.reasonCodes).toContain(
      'CI_FAILURE_DETECTED'
    )
  })

  it('unknown event throws', async () => {
    const reg = new HeroRegistry()
    registerAllHeroes(reg)
    const selector = new HeroSelector(reg)
    const runtime = new HeroRuntime(reg, new HeroExecutor(reg))
    const pipeline = new HeroPipeline(selector, runtime)
    await expect(
      pipeline.run('UNKNOWN' as 'CI_FAILURE', { event: 'CI_FAILURE' })
    ).rejects.toThrow(/Unknown hero event/)
  })

  it('unregistered hero throws when selected', async () => {
    const reg = new HeroRegistry()
    reg.register((await import('./ci-failure.hero')).ciFailureHero)
    reg.register((await import('./escalation.hero')).escalationHero)
    reg.register((await import('./analysis.hero')).analysisHero)
    const selector = new HeroSelector(reg)
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const pipeline = new HeroPipeline(selector, runtime)
    await expect(
      pipeline.run('PR_OPENED', { event: 'PR_OPENED' })
    ).rejects.toThrow(/Selected hero is not registered/)
  })
})
