/**
 * HM-1: Hero registry. Central registration and lookup.
 */

import type { Hero, HeroRole } from './hero.types'

const ERR_DUPLICATE = 'Hero with this name is already registered'

export class HeroRegistry {
  private readonly heroes: Map<string, Hero> = new Map()

  register(hero: Hero): void {
    if (this.heroes.has(hero.name)) {
      throw new Error(`${ERR_DUPLICATE}: ${hero.name}`)
    }
    this.heroes.set(hero.name, hero)
  }

  getByName(name: string): Hero | undefined {
    return this.heroes.get(name)
  }

  getAll(): Hero[] {
    return Array.from(this.heroes.values())
  }

  getByRole(role: HeroRole): Hero[] {
    return this.getAll().filter((h) => h.role === role)
  }
}
