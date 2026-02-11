import OpenAI from 'openai'
import { getSetting } from './db'
import { parseListing } from './parser'
import { SeoAuditResultSchema, type SeoAuditResult } from './schemas'

function getApiKey(): string | undefined {
  return getSetting('openai_api_key') || process.env.OPENAI_API_KEY
}

const SEO_AUDIT_SYSTEM = `You are an Etsy SEO expert. Analyze the given listing data and return a JSON object with exactly this structure (no markdown, no code block):
{
  "strengths": ["string"],
  "weaknesses": ["string"],
  "quickWins": ["string"],
  "titleRewrites": ["rewrite1", "rewrite2", "rewrite3"],
  "tags": ["tag1", "tag2", ... exactly 13 tags],
  "descriptionOutline": "string with suggested description structure/outline"
}
Return only valid JSON.`

export async function runSeoAudit(html: string, url: string): Promise<SeoAuditResult | null> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('OpenAI API key not set. Add it in Settings.')
  const parsed = parseListing(html, url)
  const client = new OpenAI({ apiKey })

  const userContent = `Listing URL: ${url}
Listing ID: ${parsed.listingId ?? 'unknown'}
Title: ${parsed.title ?? 'unknown'}
Description (snippet): ${(parsed.description ?? '').slice(0, 1500)}
Price: ${parsed.price ?? 'unknown'} ${parsed.currency ?? ''}
Tags: ${(parsed.tags ?? []).join(', ')}

Analyze this Etsy listing for SEO and return the JSON object as specified.`

  const parseResponse = (text: string): SeoAuditResult | null => {
    const cleaned = text.replace(/^```\w*\n?|\n?```$/g, '').trim()
    try {
      const json = JSON.parse(cleaned)
      return SeoAuditResultSchema.parse(json)
    } catch {
      return null
    }
  }

  let lastError: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SEO_AUDIT_SYSTEM },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      })
      const content = completion.choices[0]?.message?.content
      if (!content) continue
      const result = parseResponse(content)
      if (result) return result
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      // retry once
    }
  }
  if (lastError) throw lastError
  return null
}
