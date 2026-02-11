"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeoAudit = runSeoAudit;
const openai_1 = __importDefault(require("openai"));
const db_1 = require("./db");
const parser_1 = require("./parser");
const schemas_1 = require("./schemas");
function getApiKey() {
    return (0, db_1.getSetting)('openai_api_key') || process.env.OPENAI_API_KEY;
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
Return only valid JSON.`;
async function runSeoAudit(html, url) {
    const apiKey = getApiKey();
    if (!apiKey)
        throw new Error('OpenAI API key not set. Add it in Settings.');
    const parsed = (0, parser_1.parseListing)(html, url);
    const client = new openai_1.default({ apiKey });
    const userContent = `Listing URL: ${url}
Listing ID: ${parsed.listingId ?? 'unknown'}
Title: ${parsed.title ?? 'unknown'}
Description (snippet): ${(parsed.description ?? '').slice(0, 1500)}
Price: ${parsed.price ?? 'unknown'} ${parsed.currency ?? ''}
Tags: ${(parsed.tags ?? []).join(', ')}

Analyze this Etsy listing for SEO and return the JSON object as specified.`;
    const parseResponse = (text) => {
        const cleaned = text.replace(/^```\w*\n?|\n?```$/g, '').trim();
        try {
            const json = JSON.parse(cleaned);
            return schemas_1.SeoAuditResultSchema.parse(json);
        }
        catch {
            return null;
        }
    };
    let lastError = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SEO_AUDIT_SYSTEM },
                    { role: 'user', content: userContent },
                ],
                response_format: { type: 'json_object' },
            });
            const content = completion.choices[0]?.message?.content;
            if (!content)
                continue;
            const result = parseResponse(content);
            if (result)
                return result;
        }
        catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            // retry once
        }
    }
    if (lastError)
        throw lastError;
    return null;
}
