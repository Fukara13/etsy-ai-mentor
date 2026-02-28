import OpenAI from 'openai'
import { getSetting } from './db'
import { parseListing } from './parser'
import { SeoAuditResultSchema, type SeoAuditResult } from './schemas'
import { buildSEOAuditPrompt, parseSEOAuditResponse, type ListingData } from './prompts/seo-audit'

function getApiKey(): string | undefined {
  return getSetting('openai_api_key') || process.env.OPENAI_API_KEY
}

// Legacy prompt (kept for backward compatibility)
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

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  model: string
  timestamp: number
}

let tokenUsageHistory: TokenUsage[] = []

export function getTokenUsageHistory(): TokenUsage[] {
  return tokenUsageHistory
}

export function resetTokenUsageHistory(): void {
  tokenUsageHistory = []
}

/**
 * New SEO audit using modern prompt template
 */
export async function runSeoAuditV2(html: string, url: string): Promise<{
  result: any
  tokenUsage: TokenUsage
} | null> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('OpenAI API key not set. Add it in Settings.')

  const parsed = parseListing(html, url)
  const client = new OpenAI({ apiKey })

  const listingData: ListingData = {
    title: parsed.title,
    description: parsed.description,
    tags: parsed.tags ?? [],
    url,
  }

  const prompt = buildSEOAuditPrompt(listingData)

  try {
    const model = getSetting('openai_model') || 'gpt-4o'
    console.log(`[openai] Using model: ${model}`)
    const completion = await client.chat.completions.create({
      model: model,
      messages: [
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('OpenAI returned empty response')
    }

    const result = parseSEOAuditResponse(content)

    // Track token usage
    const usage = completion.usage
    if (usage) {
      const tokenUsage: TokenUsage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        model: completion.model,
        timestamp: Date.now(),
      }
      tokenUsageHistory.push(tokenUsage)
      console.log('[openai] Token usage:', tokenUsage)
    }

    return {
      result,
      tokenUsage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
        totalTokens: usage?.total_tokens ?? 0,
        model: completion.model,
        timestamp: Date.now(),
      },
    }
  } catch (error) {
    console.error('[openai] SEO audit v2 failed:', error)
    throw error
  }
}

/**
 * Legacy SEO audit (backward compatibility)
 */
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
      const model = getSetting('openai_model') || 'gpt-4o'
      const completion = await client.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: SEO_AUDIT_SYSTEM },
          { role: 'user', content: userContent },
        ],
        response_format: { type: 'json_object' },
      })
      const content = completion.choices[0]?.message?.content
      if (!content) continue
      const result = parseResponse(content)
      if (result) {
        // Track legacy usage too
        const usage = completion.usage
        if (usage) {
          tokenUsageHistory.push({
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
            model: completion.model,
            timestamp: Date.now(),
          })
        }
        return result
      }
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      // retry once
    }
  }
  if (lastError) throw lastError
  return null
}

export type NicheSuggestion = {
  niche_theme: string
  niche_emotion: string
  niche_buyer: string
  summary?: string
}

/**
 * Suggest niche (theme, emotion, target buyer) from product titles.
 */
export async function runNicheSuggestion(
  productTitles: string[],
  storeName?: string
): Promise<NicheSuggestion | null> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('OpenAI API key not set. Add it in Settings.')

  const client = new OpenAI({ apiKey })
  const titlesText = productTitles.length
    ? productTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')
    : '(Ürün listesi boş)'
  const storeLine = storeName ? `Mağaza adı: ${storeName}\n\n` : ''

  const systemPrompt = `Sen bir Etsy mağaza niş danışmanısın. Verilen ürün başlıklarına bakarak mağazanın nişini (tema, duygu, hedef alıcı) Türkçe ve kısa cümlelerle öner. Yanıtı sadece aşağıdaki JSON yapısında ver (markdown veya açıklama ekleme):
{"niche_theme": "tek cümle tema/ kategori", "niche_emotion": "tek cümle duygu/ hissiyat", "niche_buyer": "tek cümle hedef alıcı", "summary": "tek cümle genel niş özeti"}`

  const userPrompt = `${storeLine}Bu mağazanın ürün başlıkları:\n${titlesText}\n\nBu ürünlere göre niche_theme, niche_emotion, niche_buyer ve kısa summary öner (Türkçe).`

  try {
    const model = getSetting('openai_model') || 'gpt-4o'
    const completion = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    })
    const content = completion.choices[0]?.message?.content
    if (!content) return null
    const parsed = JSON.parse(content) as NicheSuggestion
    if (parsed.niche_theme && parsed.niche_emotion && parsed.niche_buyer) {
      return parsed
    }
    return null
  } catch (e) {
    console.error('[openai] runNicheSuggestion failed', e)
    return null
  }
}
