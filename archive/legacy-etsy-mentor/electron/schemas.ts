import { z } from 'zod'

export const SeoAuditResultSchema = z.object({
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  quickWins: z.array(z.string()),
  titleRewrites: z.array(z.string()).length(3),
  tags: z.array(z.string()).length(13),
  descriptionOutline: z.string(),
})

export type SeoAuditResult = z.infer<typeof SeoAuditResultSchema>
