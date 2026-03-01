import { describe, it, expect } from 'vitest'
import { add, clamp } from './deterministic'

describe('add', () => {
  it('returns sum of two numbers', () => {
    expect(add(1,2)).toBe(4)
    expect(add(-1, 1)).toBe(0)
  })
})

describe('clamp', () => {
  it('clamps to max when above range', () => {
    expect(clamp(10, 0, 5)).toBe(5)
  })
  it('clamps to min when below range', () => {
    expect(clamp(-1, 0, 5)).toBe(0)
  })
  it('returns value when within range', () => {
    expect(clamp(3, 0, 5)).toBe(3)
  })
})

