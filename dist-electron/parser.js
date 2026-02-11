"use strict";
/**
 * Etsy listing parser. Never throws — returns nulls and parseConfidence.
 * Extract listingId from URL; parse JSON-LD (Product/Offer); DOM fallback.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseListing = parseListing;
const DEFAULT_RESULT = {
    listingId: null,
    title: null,
    description: null,
    price: null,
    currency: null,
    tags: null,
    imageUrl: null,
    parseConfidence: 0,
};
function safeParseJson(str, fallback) {
    try {
        return JSON.parse(str);
    }
    catch {
        return fallback;
    }
}
function extractListingIdFromUrl(url) {
    const m = url.match(/\/listing\/(\d+)/);
    return m ? m[1] : null;
}
function extractJsonLd(html) {
    const scripts = [];
    const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = re.exec(html)) !== null) {
        const parsed = safeParseJson(match[1].trim(), null);
        if (parsed != null)
            scripts.push(parsed);
    }
    return scripts;
}
function fromJsonLd(scripts, url) {
    let title = null;
    let description = null;
    let price = null;
    let currency = null;
    let imageUrl = null;
    let confidence = 0.3;
    const findOffer = (obj) => {
        if (obj && typeof obj === 'object') {
            const o = obj;
            if (o['@type'] === 'Offer')
                return o;
            if (Array.isArray(o['@graph'])) {
                for (const item of o['@graph']) {
                    const offer = findOffer(item);
                    if (offer)
                        return offer;
                }
            }
            return findOffer(o['offers']) || findOffer(o['mainEntity']) || null;
        }
        return null;
    };
    const findProduct = (obj) => {
        if (obj && typeof obj === 'object') {
            const o = obj;
            if (o['@type'] === 'Product' || (Array.isArray(o['@type']) && o['@type'].includes('Product'))) {
                if (typeof o.name === 'string')
                    title = o.name;
                if (typeof o.description === 'string')
                    description = o.description;
                if (typeof o.image === 'string')
                    imageUrl = o.image;
                if (Array.isArray(o.image) && o.image[0])
                    imageUrl = String(o.image[0]);
                const offer = findOffer(o) || findOffer(o['offers']);
                if (offer) {
                    if (offer.price)
                        price = String(offer.price);
                    if (offer.priceCurrency)
                        currency = String(offer.priceCurrency);
                }
                confidence = 0.8;
            }
            if (Array.isArray(o['@graph'])) {
                for (const item of o['@graph'])
                    findProduct(item);
            }
        }
    };
    for (const script of scripts) {
        findProduct(script);
    }
    return { title, description, price, currency, imageUrl, confidence };
}
function domFallback(html) {
    const result = {};
    const ogTitle = html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i);
    if (ogTitle)
        result.title = ogTitle[1].trim();
    const ogDesc = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']*)["']/i);
    if (ogDesc)
        result.description = ogDesc[1].trim();
    const ogImage = html.match(/<meta[^>]*property\s*=\s*["']og:image["'][^>]*content\s*=\s*["']([^"']*)["']/i);
    if (ogImage)
        result.imageUrl = ogImage[1].trim();
    const priceMeta = html.match(/<meta[^>]*property\s*=\s*["']product:price:amount["'][^>]*content\s*=\s*["']([^"']*)["']/i);
    if (priceMeta)
        result.price = priceMeta[1].trim();
    const currencyMeta = html.match(/<meta[^>]*property\s*=\s*["']product:price:currency["'][^>]*content\s*=\s*["']([^"']*)["']/i);
    if (currencyMeta)
        result.currency = currencyMeta[1].trim();
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match && !result.title)
        result.title = h1Match[1].replace(/<[^>]+>/g, '').trim();
    const tagMatches = html.matchAll(/data-tag[^>]*>[\s\S]*?<\/[^>]+>/gi);
    const tags = [];
    for (const m of tagMatches) {
        const text = m[0].replace(/<[^>]+>/g, '').trim();
        if (text && text.length < 50)
            tags.push(text);
    }
    if (tags.length)
        result.tags = tags.slice(0, 20);
    return result;
}
function parseListing(html, url) {
    const out = { ...DEFAULT_RESULT };
    try {
        out.listingId = extractListingIdFromUrl(url);
        if (out.listingId)
            out.parseConfidence += 0.2;
    }
    catch {
        // keep null
    }
    try {
        const scripts = extractJsonLd(html);
        const fromLd = fromJsonLd(scripts, url);
        if (fromLd.title)
            out.title = fromLd.title;
        if (fromLd.description)
            out.description = fromLd.description;
        if (fromLd.price)
            out.price = fromLd.price;
        if (fromLd.currency)
            out.currency = fromLd.currency;
        if (fromLd.imageUrl)
            out.imageUrl = fromLd.imageUrl;
        if (fromLd.confidence != null && fromLd.confidence > out.parseConfidence)
            out.parseConfidence = fromLd.confidence;
    }
    catch {
        // keep previous
    }
    try {
        const fallback = domFallback(html);
        if (!out.title && fallback.title)
            out.title = fallback.title;
        if (!out.description && fallback.description)
            out.description = fallback.description;
        if (!out.price && fallback.price)
            out.price = fallback.price;
        if (!out.currency && fallback.currency)
            out.currency = fallback.currency;
        if (!out.imageUrl && fallback.imageUrl)
            out.imageUrl = fallback.imageUrl;
        if (fallback.tags && fallback.tags.length)
            out.tags = fallback.tags;
        if (out.parseConfidence < 0.5 && (fallback.title || fallback.price))
            out.parseConfidence = 0.5;
    }
    catch {
        // keep previous
    }
    return out;
}
