import { z } from 'zod'

export const ParsedListingSchema = z.object({
  listingId: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  imageUrl: z.string().nullable(),
  parseConfidence: z.number().min(0).max(1),
})

export const SeoAuditResultSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  quickWins: z.array(z.string()),
  titleRewrites: z.array(z.string()).length(3),
  tags: z.array(z.string()).length(13),
  descriptionOutline: z.string(),
})

export type ParsedListing = z.infer<typeof ParsedListingSchema>
export type SeoAuditResult = z.infer<typeof SeoAuditResultSchema>
