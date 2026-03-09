/**
 * HM-1: Hero domain contracts.
 * Analysis/suggestion/strategy only; no mutation, no execution authority.
 */

export type HeroRole =
  | 'architect'
  | 'repair'
  | 'risk'
  | 'strategy'
  | 'security'
  | 'performance'
  | 'seo'

export type HeroContext = {
  eventType: string
  input: unknown
  metadata?: Record<string, unknown>
}

export type HeroRecommendation = {
  title: string
  detail: string
  priority: 'low' | 'medium' | 'high'
}

export type HeroResult = {
  heroName: string
  role: HeroRole
  analysis: string
  recommendations: HeroRecommendation[]
  confidence: number
  metadata?: Record<string, unknown>
}

export type Hero = {
  name: string
  role: HeroRole
  run: (context: HeroContext) => Promise<HeroResult> | HeroResult
}
