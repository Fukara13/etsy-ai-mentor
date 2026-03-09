/**
 * HM-1: HeroExecutor tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from './hero.registry'
import { HeroExecutor } from './hero.executor'
import type { Hero, HeroContext, HeroResult } from './hero.types'

function createMockHero(
  name: string,
  role: Hero['role'],
  overrides?: Partial<HeroResult>
): Hero {
  return {
    name,
    role,
    run: () => ({
      heroName: name,
      role,
      analysis: 'Valid analysis',
      recommendations: [],
      confidence: 0.8,
      ...overrides,
    }),
  }
}

const baseContext: HeroContext = {
  eventType: 'test',
  input: {},
}

describe('HeroExecutor', () => {
  it('executes hero by name successfully', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect'))
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('architect-mock', baseContext)
    expect(result.heroName).toBe('architect-mock')
    expect(result.role).toBe('architect')
    expect(result.analysis).toBe('Valid analysis')
    expect(result.recommendations).toEqual([])
    expect(result.confidence).toBe(0.8)
  })

  it('throws when hero not found', async () => {
    const reg = new HeroRegistry()
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('unknown', baseContext)).rejects.toThrow(
      /Hero not found/
    )
  })

  it('normalizes heroName and role from canonical registered hero', async () => {
    const reg = new HeroRegistry()
    reg.register({
      name: 'repair-mock',
      role: 'repair',
      run: () => ({
        heroName: 'wrong-name',
        role: 'architect' as const,
        analysis: 'Analysis',
        recommendations: [],
        confidence: 0.9,
      }),
    })
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('repair-mock', baseContext)
    expect(result.heroName).toBe('repair-mock')
    expect(result.role).toBe('repair')
  })

  it('throws when analysis is empty', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect', { analysis: '' }))
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /analysis must be a non-empty string/
    )
  })

  it('throws when analysis is whitespace only', async () => {
    const reg = new HeroRegistry()
    reg.register(
      createMockHero('architect-mock', 'architect', { analysis: '   ' })
    )
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /analysis must be a non-empty string/
    )
  })

  it('throws when confidence is out of range', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect', { confidence: 1.5 }))
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /confidence must be a number between 0 and 1/
    )
  })

  it('throws when confidence is negative', async () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('architect-mock', 'architect', { confidence: -0.1 }))
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /confidence must be a number between 0 and 1/
    )
  })

  it('throws when recommendations is undefined', async () => {
    const reg = new HeroRegistry()
    reg.register({
      name: 'architect-mock',
      role: 'architect',
      run: () => ({
        heroName: 'architect-mock',
        role: 'architect',
        analysis: 'Ok',
        recommendations: undefined as unknown as HeroResult['recommendations'],
        confidence: 0.8,
      }),
    })
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /recommendations must be an array/
    )
  })

  it('throws when recommendations is not an array', async () => {
    const reg = new HeroRegistry()
    reg.register({
      name: 'architect-mock',
      role: 'architect',
      run: () => ({
        heroName: 'architect-mock',
        role: 'architect',
        analysis: 'Ok',
        recommendations: null as unknown as HeroResult['recommendations'],
        confidence: 0.8,
      }),
    })
    const executor = new HeroExecutor(reg)
    await expect(executor.executeByName('architect-mock', baseContext)).rejects.toThrow(
      /recommendations must be an array/
    )
  })

  it('accepts valid recommendations array', async () => {
    const reg = new HeroRegistry()
    reg.register(
      createMockHero('architect-mock', 'architect', {
        recommendations: [
          { title: 'T1', detail: 'D1', priority: 'high' },
        ],
      })
    )
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('architect-mock', baseContext)
    expect(result.recommendations).toHaveLength(1)
    expect(result.recommendations[0].title).toBe('T1')
  })
})
