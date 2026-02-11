ETSY AI MENTOR — DOMAIN FOUNDATION v1

This document defines the Core Domain Model of the Etsy AI Mentor system.

The purpose of this system is:
To help Etsy sellers systematically build, grow, and optimize their business by identifying obstacles, improving decision quality, and guiding structured execution.

----------------------------------------
CORE DOMAIN OBJECTS
----------------------------------------

1) User
- id
- level (beginner | intermediate)
- goal (revenue target, niche focus, growth objective)
- disciplineScore (future metric)
- createdAt

2) Store
- id
- userId
- niche
- positioning
- brandDirection
- kpis (revenue, conversion rate, visits, etc.)
- createdAt

3) Concept (Product Idea)
- id
- storeId
- productType
- targetAudience
- competitionLevel
- demandSignal
- ideaScore
- createdAt

4) Listing
- id
- conceptId
- title
- tags
- descriptionQualityScore
- seoScore
- imageQualityScore
- pricingStrategy
- createdAt

5) MarketSignals
- id
- listingId
- demandLevel
- competitionIntensity
- trendDirection
- competitorPatterns
- analyzedAt

6) MentorSession
Represents a single evaluation or guidance cycle.

- id
- userId
- storeId
- contextType (concept | listing | store | strategy)
- inputSnapshot
- analysisOutput
- decisionScore
- createdAt

7) DecisionPlan
Represents actionable steps user must execute.

- id
- sessionId
- tasks (array of actionable steps)
- priorityLevel
- impactScore
- difficultyScore
- status (pending | in_progress | completed)
- createdAt

8) SkillProgress
Tracks user growth over time.

- id
- userId
- seoLevel
- productResearchLevel
- brandingLevel
- executionDisciplineLevel
- lastUpdatedAt

----------------------------------------
SYSTEM PRINCIPLES
----------------------------------------

1. The system is growth-oriented, not just analysis-oriented.
2. Every analysis must result in a DecisionPlan.
3. User progression must be measurable.
4. Future Gate System will connect to DecisionPlan enforcement.
5. Architecture must remain SaaS-ready.

End of document.

