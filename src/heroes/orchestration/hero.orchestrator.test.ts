/**
 * HM-8: Orchestrator tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRuntime } from '../runtime/hero.runtime'
import { HeroPlanResolver } from './hero.plan-resolver'
import { HeroOrchestrator } from './hero.orchestrator'
import type { Hero, HeroContext } from '../core/hero.types'
import type { HeroExecutionContext } from '../runtime/hero.context'
import type { HeroExecutionResult } from '../runtime/hero.execution-result'
import { analysisHero, reviewHero, escalationHero } from '../heroes'

function createMockHero(
  name: string,
  role: Hero['role'],
  behavior: 'succeed' | 'throw'
): Hero {
  return {
    name,
    role,
    run: (_ctx: HeroContext) => {
      if (behavior === 'throw') {
        throw new Error(`Hero ${name} failed`)
      }
      return {
        heroName: name,
        role,
        analysis: `Analysis from ${name}`,
        recommendations: [],
        confidence: 0.8,
      }
    },
  }
}

function createRegistryWithAllPlannedHeroes(): HeroRegistry {
  const reg = new HeroRegistry()
  reg.register(analysisHero)
  reg.register(reviewHero)
  reg.register(escalationHero)
  reg.register(createMockHero('repairHero', 'repair', 'succeed'))
  return reg
}

describe('HeroPlanResolver', () => {
  it('resolves CI_FAILURE to ["analysisHero", "repairHero"]', () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const resolver = new HeroPlanResolver(reg)
    const plan = resolver.resolve('CI_FAILURE')
    expect(plan.event).toBe('CI_FAILURE')
    expect(plan.heroIds).toEqual(['analysisHero', 'repairHero'])
    expect(plan.strategy).toBe('sequential')
  })

  it('resolves PR_UPDATED to ["reviewHero", "analysisHero"]', () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const resolver = new HeroPlanResolver(reg)
    const plan = resolver.resolve('PR_UPDATED')
    expect(plan.heroIds).toEqual(['reviewHero', 'analysisHero'])
  })

  it('throws if any planned hero is missing from registry', () => {
    const reg = new HeroRegistry()
    reg.register(analysisHero)
    const resolver = new HeroPlanResolver(reg)
    expect(() => resolver.resolve('CI_FAILURE')).toThrow(
      'Planned hero is not registered: repairHero'
    )
  })

  it('resolves RETRY_EXHAUSTED to ["analysisHero", "escalationHero"]', () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const resolver = new HeroPlanResolver(reg)
    const plan = resolver.resolve('RETRY_EXHAUSTED')
    expect(plan.heroIds).toEqual(['analysisHero', 'escalationHero'])
  })

  it('resolves PR_OPENED to ["reviewHero"]', () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const resolver = new HeroPlanResolver(reg)
    const plan = resolver.resolve('PR_OPENED')
    expect(plan.heroIds).toEqual(['reviewHero'])
  })
})

describe('HeroOrchestrator', () => {
  it('runs multiple heroes in exact plan order', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await orchestrator.run('CI_FAILURE', ctx)

    expect(result.executions).toHaveLength(2)
    expect(result.executions[0].heroId).toBe('analysisHero')
    expect(result.executions[1].heroId).toBe('repairHero')
  })

  it('returns executions in exact order', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'PR_UPDATED' }

    const result = await orchestrator.run('PR_UPDATED', ctx)

    expect(result.executions.map((e) => e.heroId)).toEqual([
      'reviewHero',
      'analysisHero',
    ])
  })

  it('returns completedHeroIds correctly on success', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await orchestrator.run('CI_FAILURE', ctx)

    expect(result.completedHeroIds).toEqual(['analysisHero', 'repairHero'])
    expect(result.failedHeroIds).toEqual([])
    expect(result.status).toBe('completed')
  })

  it('status = "completed" when all succeed', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'PR_OPENED' }

    const result = await orchestrator.run('PR_OPENED', ctx)

    expect(result.status).toBe('completed')
    expect(result.completedHeroIds).toEqual(['reviewHero'])
    expect(result.failedHeroIds).toEqual([])
  })

  it('first succeeds, second throws - partial failure', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('firstHero', 'repair', 'succeed'))
    reg.register(createMockHero('secondHero', 'repair', 'throw'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)

    const customResolver = {
      resolve: () => ({
        event: 'CI_FAILURE' as const,
        heroIds: ['firstHero', 'secondHero'],
        strategy: 'sequential' as const,
      }),
    }
    const customOrchestrator = new HeroOrchestrator(customResolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await customOrchestrator.run('CI_FAILURE', ctx)

    expect(result.executions).toHaveLength(2)
    expect(result.executions[0].heroId).toBe('firstHero')
    expect(result.executions[0].executionResult).toBeDefined()
    expect(result.executions[0].errorMessage).toBeUndefined()
    expect(result.executions[1].heroId).toBe('secondHero')
    expect(result.executions[1].errorMessage).toBe('Hero secondHero failed')
    expect(result.executions[1].executionResult).toBeUndefined()
    expect(result.status).toBe('partial')
    expect(result.completedHeroIds).toEqual(['firstHero'])
    expect(result.failedHeroIds).toEqual(['secondHero'])
  })

  it('preserves execution order on partial failure', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('a', 'repair', 'succeed'))
    reg.register(createMockHero('b', 'repair', 'throw'))
    reg.register(createMockHero('c', 'repair', 'succeed'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const customResolver = {
      resolve: () => ({
        event: 'CI_FAILURE' as const,
        heroIds: ['a', 'b', 'c'],
        strategy: 'sequential' as const,
      }),
    }
    const orchestrator = new HeroOrchestrator(customResolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await orchestrator.run('CI_FAILURE', ctx)

    expect(result.executions.map((e) => e.heroId)).toEqual(['a', 'b', 'c'])
    expect(result.status).toBe('partial')
  })

  it('all planned heroes throw - full failure', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('failHero1', 'repair', 'throw'))
    reg.register(createMockHero('failHero2', 'repair', 'throw'))
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const customResolver = {
      resolve: () => ({
        event: 'CI_FAILURE' as const,
        heroIds: ['failHero1', 'failHero2'],
        strategy: 'sequential' as const,
      }),
    }
    const orchestrator = new HeroOrchestrator(customResolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await orchestrator.run('CI_FAILURE', ctx)

    expect(result.status).toBe('failed')
    expect(result.completedHeroIds).toEqual([])
    expect(result.failedHeroIds).toEqual(['failHero1', 'failHero2'])
    expect(result.executions).toHaveLength(2)
    expect(result.executions[0].errorMessage).toBeDefined()
    expect(result.executions[1].errorMessage).toBeDefined()
  })

  it('runtime.run called with each heroId and context including event', async () => {
    const runCalls: { heroId: string; context: HeroExecutionContext }[] = []
    const mockRuntime = {
      run: async (heroId: string, context: HeroExecutionContext) => {
        runCalls.push({ heroId, context })
        return {
          heroName: heroId,
          role: 'repair',
          contextEvent: context.event,
          analysis: 'Ok',
          recommendations: [],
          confidence: 0.8,
        } as HeroExecutionResult
      },
    }
    const reg = createRegistryWithAllPlannedHeroes()
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, mockRuntime)
    const ctx: HeroExecutionContext = {
      event: 'PR_UPDATED',
      subject: 'test-repo',
    }

    await orchestrator.run('PR_UPDATED', ctx)

    expect(runCalls).toHaveLength(2)
    expect(runCalls[0].heroId).toBe('reviewHero')
    expect(runCalls[0].context.event).toBe('PR_UPDATED')
    expect(runCalls[0].context.subject).toBe('test-repo')
    expect(runCalls[1].heroId).toBe('analysisHero')
    expect(runCalls[1].context.event).toBe('PR_UPDATED')
  })

  it('result arrays are not input references', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'CI_FAILURE' }

    const result = await orchestrator.run('CI_FAILURE', ctx)

    const plan = resolver.resolve('CI_FAILURE')
    expect(result.executions).not.toBe(plan.heroIds)
    expect(result.completedHeroIds).not.toBe(plan.heroIds)
    expect(result.failedHeroIds).not.toBe(plan.heroIds)
  })

  it('does not mutate input context', async () => {
    const reg = createRegistryWithAllPlannedHeroes()
    const executor = new HeroExecutor(reg)
    const runtime = new HeroRuntime(reg, executor)
    const resolver = new HeroPlanResolver(reg)
    const orchestrator = new HeroOrchestrator(resolver, runtime)
    const ctx: HeroExecutionContext = { event: 'PR_OPENED', subject: 'x' }

    await orchestrator.run('PR_OPENED', ctx)

    expect(ctx.event).toBe('PR_OPENED')
    expect(ctx.subject).toBe('x')
  })
})
