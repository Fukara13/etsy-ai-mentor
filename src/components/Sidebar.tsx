import { useState, useEffect, useCallback, useRef } from 'react'
import type { SeoAuditResult } from '../lib/schemas'
import { SeoAuditResultSchema } from '../lib/schemas'
import type { Capture } from '../types'

type Props = {
  sessionId: string
  refreshCapturesRef?: React.MutableRefObject<((sessionId: string, rows: Capture[]) => void) | null>
  captureId: string | null
  auditVersion?: number
  currentUrl?: string
  isListingUrl?: boolean
  onAuditError?: (message: string) => void
}

type TabId = 'seo' | 'prompt' | 'history' | 'chat' | 'competitor'

type ParsedListingSafe = { title?: string | null; price?: string | null; shopName?: string | null; [key: string]: unknown }

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max) + '…'
}

export default function Sidebar({ sessionId, refreshCapturesRef, captureId, auditVersion = 0, currentUrl = '', isListingUrl = false, onAuditError }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('seo')
  const [captures, setCaptures] = useState<Capture[]>([])
  const [capturesVersion, setCapturesVersion] = useState(0)
  const [lastCaptureImage, setLastCaptureImage] = useState<string | null>(null)
  const [parsedForBadge, setParsedForBadge] = useState<ParsedListingSafe | null>(null)

  useEffect(() => {
    if (!refreshCapturesRef) return
    refreshCapturesRef.current = (sid: string, rows: Capture[]) => {
      setCaptures(rows)
      setCapturesVersion((v) => v + 1)
    }
    return () => {
      if (refreshCapturesRef) refreshCapturesRef.current = null
    }
  }, [refreshCapturesRef])

  useEffect(() => {
    if (!sessionId || !window.electronAPI) return
    window.electronAPI.listCaptures(sessionId).then(setCaptures).catch(() => setCaptures([]))
  }, [sessionId, activeTab])

  useEffect(() => {
    if (!captureId || !window.electronAPI) {
      setLastCaptureImage(null)
      setParsedForBadge(null)
      return
    }
    window.electronAPI.getCaptureImage(captureId).then(setLastCaptureImage)
    if (isListingUrl) {
      window.electronAPI.getParsedListing(captureId).then((data) => {
        setParsedForBadge(data != null && typeof data === 'object' ? (data as ParsedListingSafe) : null)
      }).catch(() => setParsedForBadge(null))
    } else {
      setParsedForBadge(null)
    }
  }, [captureId, isListingUrl])

  return (
    <aside className="sidebar">
      {isListingUrl && (
        <div className="sidebar-listing-badge">
          <span className="listing-badge-label">Listing detected</span>
          {parsedForBadge?.shopName && <span className="listing-badge-shop">{parsedForBadge.shopName}</span>}
          {parsedForBadge?.title && !parsedForBadge?.shopName && (
            <span className="listing-badge-title">{truncate(parsedForBadge.title, 32)}</span>
          )}
          {parsedForBadge?.price && <span className="listing-badge-price">{parsedForBadge.price}</span>}
        </div>
      )}
      {!isListingUrl && currentUrl && !currentUrl.startsWith('about:') && (
        <div className="sidebar-listing-warning">
          Not a listing page. Open a URL with <code>/listing/</code> to enable Analyze.
        </div>
      )}
      {captureId && (
        <div className="sidebar-last-captured">
          <h3 className="sidebar-mini-title">Last captured</h3>
          {lastCaptureImage ? (
            <img src={lastCaptureImage} alt="Last capture" className="last-captured-thumb" />
          ) : (
            <span className="muted">Loading…</span>
          )}
        </div>
      )}
      <div className="sidebar-tabs">
        <button type="button" className={activeTab === 'seo' ? 'active' : ''} onClick={() => setActiveTab('seo')}>
          SEO Audit
        </button>
        <button type="button" className={activeTab === 'prompt' ? 'active' : ''} onClick={() => setActiveTab('prompt')}>
          Prompt Studio
        </button>
        <button type="button" className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
          History
        </button>
        <button type="button" className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}>
          Mentor Chat
        </button>
        <button type="button" className={activeTab === 'competitor' ? 'active' : ''} onClick={() => setActiveTab('competitor')}>
          Competitor
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'seo' && <SeoAuditTab captureId={captureId} currentUrl={currentUrl} auditVersion={auditVersion} isListingUrl={isListingUrl} onAuditError={onAuditError} />}
        {activeTab === 'prompt' && <PromptStudioTab sessionId={sessionId} captureId={captureId} auditVersion={auditVersion} />}
        {activeTab === 'history' && <HistoryTab sessionId={sessionId} isActive={activeTab === 'history'} captures={captures} capturesVersion={capturesVersion} />}
        {activeTab === 'chat' && <MentorChatTab />}
        {activeTab === 'competitor' && <CompetitorTab sessionId={sessionId} />}
      </div>
    </aside>
  )
}

type ParsedForPreview = {
  title?: string | null
  description?: string | null
  price?: string | null
  imageUrl?: string | null
  imageCount?: number
  [key: string]: unknown
}

function SeoAuditTab({ captureId, currentUrl, auditVersion, isListingUrl, onAuditError }: { captureId: string | null; currentUrl: string; auditVersion: number; isListingUrl: boolean; onAuditError?: (message: string) => void }) {
  const [audit, setAudit] = useState<SeoAuditResult | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)
  const [previewParsed, setPreviewParsed] = useState<ParsedForPreview | null>(null)

  const fetchAudit = useCallback(() => {
    if (!captureId || !window.electronAPI) return
    window.electronAPI.getAiOutput(captureId, 'seo_audit').then((data) => {
      const parsed = data != null ? SeoAuditResultSchema.safeParse(data) : null
      setAudit(parsed?.success ? parsed.data : null)
    })
  }, [captureId])

  useEffect(() => {
    fetchAudit()
  }, [fetchAudit, auditVersion])

  useEffect(() => {
    if (!captureId || !isListingUrl || !window.electronAPI) {
      setPreviewParsed(null)
      return
    }
    window.electronAPI.getParsedListing(captureId).then((data) => {
      if (data != null && typeof data === 'object') {
        const p = data as ParsedForPreview
        setPreviewParsed({
          ...p,
          imageCount: p.imageUrl ? 1 : (typeof p.imageCount === 'number' ? p.imageCount : 0),
        })
      } else {
        setPreviewParsed(null)
      }
    }).catch(() => setPreviewParsed(null))
  }, [captureId, isListingUrl])

  if (!captureId) {
    return (
      <div className="tab-panel">
        <p className="muted">Capture a listing page (URL with /listing/), then click Analyze to see SEO audit.</p>
      </div>
    )
  }

  if (!isListingUrl) {
    return (
      <div className="tab-panel">
        <p className="muted">Analyze is only available for Etsy listing pages. Navigate to a URL containing /listing/ and capture again.</p>
      </div>
    )
  }

  const handleAnalyze = async () => {
    console.log('[ui] run audit clicked', { captureId, currentUrl, isListing: isListingUrl })
    if (!captureId) {
      onAuditError?.('No capture found. Click Capture first.')
      return
    }
    if (!window.api?.captureAnalyze) {
      onAuditError?.('App not ready.')
      return
    }
    setIsAuditing(true)
    try {
      console.log('[ui] invoking capture:analyze', captureId)
      const result = await window.api.captureAnalyze(captureId)
      console.log('[ui] audit result', result)
      if (result == null || result === undefined) {
        onAuditError?.('No response from main process.')
        return
      }
      if (result.ok) {
        fetchAudit()
      } else {
        onAuditError?.(result.errorMessage)
      }
    } catch (err) {
      console.warn('[ui] audit error', err)
      onAuditError?.((err as Error)?.message ?? 'Audit failed.')
    } finally {
      setIsAuditing(false)
    }
  }

  if (!audit) {
    const titleLen = previewParsed?.title != null ? String(previewParsed.title).length : 0
    const imageCount = previewParsed?.imageUrl ? 1 : (previewParsed?.imageCount ?? 0)
    const hasPrice = !!(previewParsed?.price)
    const hasDesc = !!(previewParsed?.description && String(previewParsed.description).trim())
    return (
      <div className="tab-panel pre-analyze-preview">
        <p className="muted">No audit yet. Preview from captured data:</p>
        <ul className="preview-stats">
          <li>Title length: {titleLen} chars</li>
          <li>Image count: {imageCount}</li>
          <li>Price: {hasPrice ? 'Yes' : 'No'}</li>
          <li>Description: {hasDesc ? 'Yes' : 'No'}</li>
        </ul>
        <p className="preview-helper muted small">Run SEO Audit below to get strengths, weaknesses, title rewrites, and tags.</p>
        <div className="run-audit-row">
          <button type="button" className="btn-primary" onClick={handleAnalyze} disabled={isAuditing} aria-busy={isAuditing}>
            {isAuditing ? 'Analyzing…' : 'Run SEO Audit'}
          </button>
          {isAuditing && <span className="run-audit-status">Running…</span>}
        </div>
      </div>
    )
  }

  const copyTags = () => {
    const text = audit.tags.join(', ')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="tab-panel seo-audit">
      <section>
        <h3>Strengths</h3>
        <ul>{audit.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </section>
      <section>
        <h3>Weaknesses</h3>
        <ul>{audit.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </section>
      <section>
        <h3>Quick wins</h3>
        <ul>{audit.quickWins.map((q, i) => <li key={i}>{q}</li>)}</ul>
      </section>
      <section>
        <h3>Title rewrites (3)</h3>
        <ol>{audit.titleRewrites.map((t, i) => <li key={i}>{t}</li>)}</ol>
      </section>
      <section>
        <h3>Tags (13)</h3>
        <div className="tags-row">
          <span className="tags-list">{audit.tags.join(', ')}</span>
          <button type="button" className="btn-copy" onClick={copyTags}>Copy</button>
        </div>
      </section>
      <section>
        <h3>Description outline</h3>
        <p className="description-outline">{audit.descriptionOutline}</p>
      </section>
    </div>
  )
}

const PROMPT_STYLES = ['Retro vintage', 'Minimal line art', 'Cute / playful', 'Bold typography', 'Dark humor'] as const
const MAX_STYLES = 2
const GUARDRAILS = 't-shirt design only, print-ready, flat design, transparent background, no mockup, no realistic photo, no watermark, centered composition, 300 DPI.'

type ListingContext = {
  title: string
  niche: string
  audience: string
  mood: string
}

function inferPurchaseIntent(parsed: { title?: string | null; price?: string | null; tags?: string[] | null } | null): 'gift' | 'self' | 'impulse' {
  const title = (parsed?.title && String(parsed.title).trim()) || ''
  const tags = parsed && Array.isArray(parsed.tags) ? parsed.tags : []
  const combined = (title + ' ' + tags.join(' ')).toLowerCase()
  
  const giftKeywords = ['gift', 'present', 'for her', 'for him', 'birthday', 'anniversary', 'wedding', 'graduation', 'valentine', 'christmas', 'holiday']
  const selfKeywords = ['for me', 'personalized', 'custom', 'my', 'self-care', 'personal']
  const impulseKeywords = ['fun', 'quirky', 'novelty', 'trendy', 'viral', 'funny', 'cute']
  
  for (const kw of giftKeywords) {
    if (combined.includes(kw)) return 'gift'
  }
  
  for (const kw of selfKeywords) {
    if (combined.includes(kw)) return 'self'
  }
  
  const priceStr = parsed?.price ? String(parsed.price).replace(/[^0-9.]/g, '') : ''
  const priceNum = priceStr ? parseFloat(priceStr) : null
  if (priceNum !== null && priceNum < 20) {
    for (const kw of impulseKeywords) {
      if (combined.includes(kw)) return 'impulse'
    }
  }
  
  return 'self'
}

function inferListingContext(parsed: { title?: string | null; price?: string | null; tags?: string[] | null } | null): ListingContext {
  const title = (parsed?.title && String(parsed.title).trim()) || 'Product'
  const tags = parsed && Array.isArray(parsed.tags) ? parsed.tags : []
  const combined = (title + ' ' + tags.join(' ')).toLowerCase()
  const niche = tags.length > 0 ? tags.slice(0, 3).join(', ') : (title.length > 10 ? title.slice(0, 50) + '…' : 'Etsy listing')
  const audience = 'Etsy buyers and gift shoppers'
  const moodMap: Record<string, string> = {
    funny: 'funny', cozy: 'cozy', sarcastic: 'sarcastic', cute: 'cute', playful: 'playful',
    bold: 'bold', minimal: 'minimal', vintage: 'retro', dark: 'dark humor', dramatic: 'dramatic',
  }
  let mood = 'creative'
  for (const [key, val] of Object.entries(moodMap)) {
    if (combined.includes(key)) {
      mood = val
      break
    }
  }
  return { title, niche, audience, mood }
}

type AuditSignals = {
  titleTooLong: boolean
  redundantKeywords: boolean
  weakStorytelling: boolean
  unclearAudience: boolean
}

function deriveAuditSignals(weaknesses: string[]): AuditSignals {
  const lower = weaknesses.map((w) => w.toLowerCase()).join(' ')
  return {
    titleTooLong: /title too long|long title|too lengthy/i.test(lower),
    redundantKeywords: /keyword stuffing|redundant keywords|repetition/i.test(lower),
    weakStorytelling: /storytelling|emotion|generic|boring/i.test(lower),
    unclearAudience: /audience|target|unclear|vague/i.test(lower),
  }
}

function buildCanvaPrompt(ctx: { title: string; niche: string; audience: string; mood: string; styles: string[]; auditSignals?: AuditSignals }): string {
  const style = ctx.styles.length > 0 ? ctx.styles.join(' + ') : 'illustrated'
  let guidance = ''
  if (ctx.auditSignals) {
    const hints: string[] = []
    if (ctx.auditSignals.weakStorytelling) hints.push('Emphasize emotional connection and storytelling elements')
    if (ctx.auditSignals.unclearAudience) hints.push('Make the target audience visually clear and specific')
    if (ctx.auditSignals.titleTooLong) hints.push('Keep text concise and impactful')
    if (ctx.auditSignals.redundantKeywords) hints.push('Avoid repetitive visual elements')
    if (hints.length > 0) guidance = '\nDesign guidance: ' + hints.join('. ') + '.'
  }
  const body = `Create a ${style} t-shirt design featuring "${ctx.title}".
Mood: ${ctx.mood}.
Target audience: ${ctx.audience}.
Niche: ${ctx.niche}.${guidance}
Use a cohesive color palette (2–4 colors). Typography should feel ${ctx.mood}, clear and readable.
Flat vector style, no mockup, transparent background, centered composition, print-ready, 300 DPI.`
  return body + '\n\n' + GUARDRAILS
}

function buildIdeogramPrompt(ctx: { title: string; niche: string; audience: string; mood: string; styles: string[]; auditSignals?: AuditSignals }): string {
  const style = ctx.styles.length > 0 ? ctx.styles.join(', ') : 'illustrated'
  let guidance = ''
  if (ctx.auditSignals) {
    const hints: string[] = []
    if (ctx.auditSignals.weakStorytelling) hints.push('emotional storytelling')
    if (ctx.auditSignals.unclearAudience) hints.push('clear target audience')
    if (ctx.auditSignals.titleTooLong) hints.push('concise impactful text')
    if (ctx.auditSignals.redundantKeywords) hints.push('avoid repetition')
    if (hints.length > 0) guidance = ', ' + hints.join(', ')
  }
  return `${style} t-shirt design of "${ctx.title}", ${ctx.mood} tone, designed for ${ctx.audience}${guidance}, flat vector illustration, bold clear lines, no background, no mockup, no realistic photo, no watermark, print-ready, centered composition, 300 DPI. ${GUARDRAILS}`
}

type CompetitorSignals = {
  title?: string | null
  price?: string | null
  photoCount?: number | null
  rating?: string | null
  reviewCount?: number | null
  shippingCue?: string | null
}

function hasAnyCompetitorSignal(s: CompetitorSignals | null): boolean {
  if (!s || typeof s !== 'object') return false
  return (
    (typeof s.title === 'string' && s.title.trim() !== '') ||
    (typeof s.price === 'string' && s.price.trim() !== '') ||
    (typeof s.photoCount === 'number' && s.photoCount > 0) ||
    (typeof s.rating === 'string' && s.rating.trim() !== '') ||
    (typeof s.reviewCount === 'number' && s.reviewCount >= 0) ||
    (typeof s.shippingCue === 'string' && s.shippingCue.trim() !== '')
  )
}

type AuditSignalsForReasoning = {
  titleTooLong?: boolean
  redundantKeywords?: boolean
  weakStorytelling?: boolean
  unclearAudience?: boolean
}

type ConfidenceLevel = 'Yüksek' | 'Orta' | 'Düşük'
type PriorityLevel = 'Yüksek' | 'Orta' | 'Düşük'

function withConfidence(text: string, level: ConfidenceLevel): string {
  return `${text} (Güven Seviyesi: ${level})`
}

function withPriority(
  text: string,
  confidence: ConfidenceLevel,
  priority: PriorityLevel,
  justification: string
): string {
  return `${text}\nGüven Seviyesi: ${confidence}\nÖncelik: ${priority} — ${justification}`
}

/**
 * Builds 3–5 Turkish bullets with confidence + priority. Preserves SEO/differentiation logic.
 * Priority: Yüksek = do first (high impact, low risk). Orta = useful, not urgent. Düşük = optional, later.
 */
function buildCompetitorAndSeoReasoningBullets(
  own: { title?: string | null; purchaseIntent: string },
  competitor: CompetitorSignals | null,
  auditSignals: AuditSignalsForReasoning | undefined,
  storeLevel: 1 | 2 | 3
): string[] {
  const hasComp = hasAnyCompetitorSignal(competitor)
  const hasSeo =
    !!auditSignals &&
    (auditSignals.titleTooLong ||
      auditSignals.redundantKeywords ||
      auditSignals.weakStorytelling ||
      auditSignals.unclearAudience)

  if (!hasComp && !hasSeo) {
    return [
      withPriority(
        'Rakipten ve SEO denetiminden veri yok; öneriler sadece ilan metni ve seçimlerine göre. Hiçbir SEO zayıflığı varsayılmadı.',
        'Düşük',
        'Düşük',
        'veri olmadığı için önce rakip/SEO verisi toplanmalı'
      ),
    ]
  }
  if (!hasComp) {
    const lines: string[] = [
      withPriority(
        'Rakipten sınırlı veri alındı; farklılaşma nedenleri SEO denetimi ve ilan verisine dayanıyor.',
        'Orta',
        'Orta',
        'kısmi veriyle öneriler sınırlı'
      ),
    ]
    if (hasSeo) {
      if (auditSignals!.titleTooLong) lines.push(withPriority('SEO’da başlık çok uzun → istemde metni kısa ve etkili tutma vurgulandı.', 'Yüksek', 'Yüksek', 'SEO etkisi yüksek, düşük risk, önce uygula'))
      if (auditSignals!.redundantKeywords) lines.push(withPriority('SEO’da anahtar kelime tekrarı → tasarımda tekrardan kaçınma önerildi.', 'Yüksek', 'Orta', 'faydalı ama acil değil'))
      if (auditSignals!.weakStorytelling) lines.push(withPriority('SEO’da hikaye anlatımı zayıf → duygusal bağ ve hikaye brife eklendi.', 'Yüksek', 'Orta', 'tasarım yönü, acele değil'))
      if (auditSignals!.unclearAudience) lines.push(withPriority('SEO’da hedef kitle net değil → hedef kitle istemde açıkça vurgulandı.', 'Yüksek', 'Yüksek', 'net etki, hemen uygulanabilir'))
    }
    return lines.slice(0, 5)
  }
  if (!hasSeo) {
    return [
      withPriority(
        'Bu kayıt için SEO denetimi bulunmadığı için, nedenler yalnızca rakip verileri ve ilan bağlamına dayanarak oluşturuldu.',
        'Orta',
        'Orta',
        'SEO yok; öncelikler rakip verisine göre belirlendi'
      ),
      ...buildDifferentiationBullets(own, competitor!, auditSignals, storeLevel),
    ].slice(0, 5)
  }

  return buildDifferentiationBullets(own, competitor!, auditSignals, storeLevel)
}

/** Differentiation + SEO logic with confidence and priority. Never rank everything high. */
function buildDifferentiationBullets(
  own: { title?: string | null; purchaseIntent: string },
  c: CompetitorSignals,
  auditSignals: AuditSignalsForReasoning | undefined,
  storeLevel: 1 | 2 | 3
): string[] {
  const bullets: string[] = []

  if (typeof c.photoCount === 'number' && c.photoCount > 0) {
    bullets.push(
      withPriority(
        `Rakipler ${c.photoCount} görselle yoğun grid kullanıyor → bunu taklit etmek yerine, az sayıda güçlü görselle öne çıkma yönü seçildi.`,
        'Yüksek',
        'Orta',
        'stratejik bir ayrışma kararı, acil değil'
      )
    )
  }

  const ownTitle = (own.title || '').toLowerCase()
  const hasGiftOwn = /gift|hediye|present/i.test(ownTitle)
  const compTitle = (c.title || '').toLowerCase()
  const hasGiftComp = /gift|hediye|present/i.test(compTitle)
  if (hasGiftComp && !hasGiftOwn) {
    const seoNote =
      auditSignals?.titleTooLong || auditSignals?.redundantKeywords
        ? ' SEO’da başlık uzun/tekrarlı olduğu için kısa ve net tutulması da hedeflendi.'
        : ''
    bullets.push(
      withPriority(
        `Rakipler hediye dilini başlıkta vurguluyor → aynı ifadeyi kopyalamak yerine, brifte hedef kitle vurgusuyla farklılaşma tercih edildi.${seoNote}`,
        'Yüksek',
        'Yüksek',
        'hedef kitle net, düşük risk, önce yap'
      )
    )
  }

  if (c.price && typeof c.price === 'string' && c.price.trim()) {
    bullets.push(
      withPriority(
        'Rakipler fiyatı görselle öne çıkarıyor → aynı yolu tekrarlamak yerine, sade ve premium görsel dil ile ayrışma yönü seçildi.',
        'Orta',
        'Düşük',
        'görsel yön tercihi, daha sonra test edilebilir'
      )
    )
  }

  if ((c.rating && typeof c.rating === 'string') || (typeof c.reviewCount === 'number' && c.reviewCount >= 0)) {
    bullets.push(
      withPriority(
        'Rakipler puan/inceleme ile güven vurguluyor → onları taklit etmek yerine, tasarımda kalite ve güven hissiyle farklılaşma hedeflendi.',
        'Yüksek',
        'Orta',
        'faydalı ama acil değil'
      )
    )
  }

  if (c.shippingCue && typeof c.shippingCue === 'string' && c.shippingCue.trim()) {
    bullets.push(
      withPriority(
        'Rakipler teslimat mesajını öne çıkarıyor → mesajı kopyalamak yerine, brifte kendi konumlandırmanla (sade/net) farklılaşma tercih edildi.',
        'Yüksek',
        'Düşük',
        'konumlandırma detayı, sonra denenebilir'
      )
    )
  }

  if (auditSignals?.unclearAudience && !bullets.some((b) => b.includes('hedef kitle'))) {
    bullets.push(
      withPriority(
        'SEO’da hedef kitle net değil → rakiplerin dilini tekrarlamak yerine, istemde hedef kitleyi açıkça vurgulayarak konumlanma seçildi.',
        'Yüksek',
        'Yüksek',
        'net etki, düşük risk'
      )
    )
  }

  if (auditSignals?.redundantKeywords && !bullets.some((b) => b.includes('tekrar'))) {
    bullets.push(
      withPriority(
        'SEO’da anahtar kelime tekrarı var → rakiplerle aynı tekrara düşmemek için tasarımda sade ve net ifade önerildi.',
        'Yüksek',
        'Orta',
        'faydalı ama acil değil'
      )
    )
  }

  if (bullets.length === 0) {
    return [
      withPriority(
        'Rakipten ve SEO’dan gelen veriler sınırlı; farklılaşma önerileri mevcut verilere dayanır.',
        'Düşük',
        'Düşük',
        'veri sınırlı, önce daha fazla veri'
      ),
    ]
  }
  const out = bullets.slice(0, 5)
  // Özet satırı yalnızca çok az somut nokta varken ekle; 2+ nokta varsa tekrara düşmesin.
  const addSummary = out.length <= 1
  return addSummary ? [...out, withPriority('Rakip ve (varsa) SEO verilerine göre bilinçli farklılaşma yönü mevcut istemde toplandı.', 'Orta', 'Orta', 'genel yön belirleme, adımlar sıralı uygulanmalı')] : out
}

type ActionPlanGroups = { yuksek: string[]; orta: string[]; dusuk: string[] }

/**
 * Builds actionable steps grouped by priority. Same data/priority logic as reasoning; output is steps only.
 */
function buildActionPlanGroups(
  own: { title?: string | null; purchaseIntent: string },
  competitor: CompetitorSignals | null,
  auditSignals: AuditSignalsForReasoning | undefined,
  _storeLevel: 1 | 2 | 3
): ActionPlanGroups {
  const yuksek: string[] = []
  const orta: string[] = []
  const dusuk: string[] = []

  const hasComp = hasAnyCompetitorSignal(competitor)
  const hasSeo =
    !!auditSignals &&
    (auditSignals.titleTooLong ||
      auditSignals.redundantKeywords ||
      auditSignals.weakStorytelling ||
      auditSignals.unclearAudience)

  if (!hasComp && !hasSeo) {
    dusuk.push('Veri sınırlı; önce rakip veya SEO verisi topla.')
    return { yuksek, orta, dusuk }
  }

  if (!hasComp && hasSeo) {
    if (auditSignals!.titleTooLong) yuksek.push('İstemde metni kısa ve etkili tut.')
    if (auditSignals!.unclearAudience) yuksek.push('İstemde hedef kitleyi açıkça yaz.')
    if (auditSignals!.redundantKeywords) orta.push('Tasarımda tekrardan kaçın.')
    if (auditSignals!.weakStorytelling) orta.push('Duygusal bağ ve hikaye öğelerini brife ekle.')
    return { yuksek, orta, dusuk }
  }

  if (hasComp && !hasSeo) {
    yuksek.push('Bu kayıt için SEO denetimi bulunmadığından, ek değişiklik yapmadan mevcut prompt ile ilk tasarımı üret.')
    yuksek.push('İlk çıktıyı kaydet ve görsel netlik (çizgi kalınlığı, okunurluk) açısından kontrol et.')
    const c = competitor!
    if (typeof c.photoCount === 'number' && c.photoCount > 0) {
      orta.push('Rakiplerdeki kalabalık grid kullanımından ayrışmak için tek ana illüstrasyon kullan.')
      orta.push('Çizimi merkezde konumlandır, çevresinde boşluk (negative space) bırak.')
      orta.push('Metin–çizim oranını %60 yazı / %40 görsel olacak şekilde dengele.')
    }
    dusuk.push('Alternatif bir varyasyon için çizgi kalınlığını %10 incelterek ikinci bir deneme al.')
    dusuk.push('Premium his için gereksiz detayları sadeleştir (fazla çizgileri kaldır).')
    return { yuksek, orta, dusuk }
  }

  const c = competitor!
  if (auditSignals!.titleTooLong) yuksek.push('İstemde metni kısa ve etkili tut.')
  if (auditSignals!.unclearAudience) yuksek.push('İstemde hedef kitleyi açıkça yaz.')
  const ownTitle = (own.title || '').toLowerCase()
  const hasGiftOwn = /gift|hediye|present/i.test(ownTitle)
  const compTitle = (c.title || '').toLowerCase()
  const hasGiftComp = /gift|hediye|present/i.test(compTitle)
  if (hasGiftComp && !hasGiftOwn) yuksek.push('Brifte hedef kitle vurgusunu ekle (kopyalamadan).')
  if (typeof c.photoCount === 'number' && c.photoCount > 0) orta.push('Az sayıda güçlü görselle öne çık; rakip gibi çok görsel kullanma.')
  if (auditSignals!.redundantKeywords) orta.push('Tasarımda tekrardan kaçın.')
  if (auditSignals!.weakStorytelling) orta.push('Duygusal bağ ve hikaye öğelerini brife ekle.')
  if ((c.rating && typeof c.rating === 'string') || (typeof c.reviewCount === 'number' && c.reviewCount >= 0)) orta.push('Tasarımda kalite ve güven hissini vurgula.')
  if (c.price && typeof c.price === 'string' && c.price.trim()) dusuk.push('Sade ve premium görsel dil kullan.')
  if (c.shippingCue && typeof c.shippingCue === 'string' && c.shippingCue.trim()) dusuk.push('Brifte sade/net teslimat konumlandırması ekle (isteğe bağlı).')
  return { yuksek, orta, dusuk }
}

function formatActionPlanForDisplay(g: ActionPlanGroups): string[] {
  const blocks: string[] = []
  if (g.yuksek.length) blocks.push('Öncelik: Yüksek\n' + g.yuksek.map((s) => '• ' + s).join('\n'))
  if (g.orta.length) blocks.push('Öncelik: Orta\n' + g.orta.map((s) => '• ' + s).join('\n'))
  if (g.dusuk.length) blocks.push('Öncelik: Düşük\n' + g.dusuk.map((s) => '• ' + s).join('\n'))
  return blocks
}

/** Yayın öncesi kontrol listesi: 8–12 madde, EVET/HAYIR ile doğrulanabilir. Veri yoksa ilgili madde "Kontrol edilemedi (veri yok)". */
function buildPrePublishChecklist(hasActionPlan: boolean): string[] {
  const items: string[] = [
    'Çıktı 300 DPI veya yayın için uygun çözünürlükte mi?',
    'Arka plan şeffaf veya düz (listing’e uygun) mı?',
    'Filigran / watermark yok mu?',
    'Mockup veya gerçekçi fotoğraf kullanılmadı mı?',
    'Metin/yazı net okunaklı mı?',
    'Kompozisyon merkezde ve dengeli mi?',
    'Görsel Etsy liste grid’ine uygun oranda mı?',
    'Tasarım baskıya hazır (print-ready) formatta mı?',
    'Stil brifle tutarlı mı?',
  ]
  if (hasActionPlan) {
    items.push('Aksiyon planındaki yüksek öncelikli adımlar uygulandı mı?')
  } else {
    items.push('Aksiyon planı uygulandı mı? — Kontrol edilemedi (veri yok).')
  }
  items.push('Kontrast ve çizgi kalınlığı ekranda ve baskıda yeterli mi?')
  return items
}

/** 3–5 güvenli varyasyon: her biri yalnızca tek değişken. Mesaj, stil ailesi, hedef kitle değişmez. */
function buildVariationPlan(styles: string[]): string[] {
  const styleLabel = styles.length > 0 ? styles.join(', ') : 'stil'
  const blocks: string[] = []
  blocks.push(
    'Varyasyon 1:\n  Değişen: Çizgi kalınlığı hafifçe artırılır veya azaltılır.\n  Sabit kalan: Metin, ' + styleLabel + ', hedef kitle.\n  Amaç: Farklı ekran ve baskıda okunaklılığı test etmek.'
  )
  blocks.push(
    'Varyasyon 2:\n  Değişen: Metin–görsel oranı hafifçe kaydırılır (daha fazla veya daha az negatif boşluk).\n  Sabit kalan: Ana mesaj, ' + styleLabel + ', hedef kitle.\n  Amaç: Grid’de hangi oranın daha iyi göründüğünü görmek.'
  )
  blocks.push(
    'Varyasyon 3:\n  Değişen: Yazı ağırlığı (bold/regular) vurgusu tek yönde değiştirilir.\n  Sabit kalan: İçerik, stil ailesi, kitle.\n  Amaç: Tıklanma için hangi vurgunun daha etkili olduğunu denemek.'
  )
  blocks.push(
    'Varyasyon 4:\n  Değişen: Kenar boşluğu (margin) artırılır veya azaltılır.\n  Sabit kalan: Kompozisyon merkezi, mesaj, ' + styleLabel + '.\n  Amaç: Premium his ve Etsy grid uyumunu test etmek.'
  )
  blocks.push(
    'Varyasyon 5:\n  Değişen: Kontrast (açık/koyu) hafifçe artırılır veya azaltılır; renk sayısı aynı kalır.\n  Sabit kalan: Palet, mesaj, hedef kitle.\n  Amaç: Baskıda netlik ve okunaklılığı doğrulamak.'
  )
  return blocks
}

function PromptStudioTab({ sessionId, captureId, auditVersion }: { sessionId: string; captureId: string | null; auditVersion: number }) {
  const [parsed, setParsed] = useState<{ title?: string | null; price?: string | null; tags?: string[] | null } | null>(null)
  const [loadingParsed, setLoadingParsed] = useState(false)
  const [audit, setAudit] = useState<SeoAuditResult | null>(null)
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [platform, setPlatform] = useState<'canva' | 'ideogram' | null>(null)
  const [promptText, setPromptText] = useState('')
  const [copied, setCopied] = useState(false)
  const [reasoningLines, setReasoningLines] = useState<string[]>([])
  const [competitorReasoningLines, setCompetitorReasoningLines] = useState<string[]>([])
  const [prePublishChecklist, setPrePublishChecklist] = useState<string[]>([])
  const [variationPlan, setVariationPlan] = useState<string[]>([])
  const [storeLevel, setStoreLevel] = useState<1 | 2 | 3>(1)

  const listingContext = inferListingContext(parsed ?? null)
  const purchaseIntent = inferPurchaseIntent(parsed ?? null)
  const auditSignals = audit ? deriveAuditSignals(audit.weaknesses) : undefined
  const hasAuditHints =
    !!auditSignals &&
    (auditSignals.titleTooLong ||
      auditSignals.redundantKeywords ||
      auditSignals.weakStorytelling ||
      auditSignals.unclearAudience)

  useEffect(() => {
    if (!captureId || !window.electronAPI) {
      setParsed(null)
      setLoadingParsed(false)
      setAudit(null)
      return
    }
    setLoadingParsed(true)
    window.electronAPI.getParsedListing(captureId).then((data) => {
      if (data != null && typeof data === 'object') {
        const o = data as { title?: string | null; price?: string | null; tags?: string[] | null }
        setParsed({ title: o.title, price: o.price, tags: o.tags })
      } else {
        setParsed(null)
      }
    }).catch(() => setParsed(null)).finally(() => setLoadingParsed(false))
    window.electronAPI.getAiOutput(captureId, 'seo_audit').then((data) => {
      const parsed = data != null ? SeoAuditResultSchema.safeParse(data) : null
      setAudit(parsed?.success ? parsed.data : null)
    }).catch(() => setAudit(null))
  }, [captureId, auditVersion])

  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(style)) return prev.filter((s) => s !== style)
      if (prev.length >= MAX_STYLES) return prev
      return [...prev, style]
    })
  }

  const canGenerate = selectedStyles.length >= 1 && platform !== null
  const handleGenerate = async () => {
    if (selectedStyles.length < 1 || !platform) return
    const ctx = {
      ...listingContext,
      styles: selectedStyles,
      auditSignals,
    }
    const text = platform === 'canva' ? buildCanvaPrompt(ctx) : buildIdeogramPrompt(ctx)
    setPromptText(text)

    const reasons: string[] = []

    if (audit && hasAuditHints && auditSignals) {
      const drivenBy: string[] = []
      if (auditSignals.weakStorytelling) drivenBy.push('hikaye anlatımı zayıf')
      if (auditSignals.unclearAudience) drivenBy.push('hedef kitle net değil')
      if (auditSignals.titleTooLong) drivenBy.push('başlık çok uzun')
      if (auditSignals.redundantKeywords) drivenBy.push('anahtar kelime tekrarı')
      if (drivenBy.length > 0) {
        reasons.push(
          `SEO denetiminde tespit edilen zayıflıkları (${drivenBy.join(
            ', '
          )}) tasarım brifine ek yönlendirmelerle güçlendiriyoruz.`
        )
      }
    } else {
      reasons.push('Bu kayıt için henüz bir SEO denetimi yok; bu istem sadece ilan metni ve senin yaptığın seçimlere göre oluşturuldu.')
    }

    if (selectedStyles.length === 1) {
      reasons.push(`Genel görsel yönü belirlemek için seçtiğin “${selectedStyles[0]}” stiline ağırlık veriyoruz.`)
    } else if (selectedStyles.length > 1) {
      reasons.push(`İstediğin hissi yakalamak için seçtiğin stilleri (“${selectedStyles.join('” + “')}”) birlikte harmanlıyoruz.`)
    }

    if (platform === 'canva') {
      reasons.push('Metin, Canva içinde rahat kullanılacak net ve adım adım bir tasarım brifi olarak yazıldı.')
    } else if (platform === 'ideogram') {
      reasons.push('Metin, Ideogram için kısa, görsel odaklı ve hızlı sonuç alabileceğin bir ifade olarak kurgulandı.')
    }

    if (listingContext.audience) {
      reasons.push(`İstem içinde hedef kitleyi (“${listingContext.audience}”) özellikle vurguluyoruz ki tasarım onlara net bir şekilde hitap etsin.`)
    }

    if (storeLevel === 1) {
      reasons.push('Seviye 1 (yeni / küçük) bir mağaza için ton daha güvenli; temel satış mesajlarını netleştirip risk almadan dönüşüm sağlamaya odaklanıyoruz.')
    } else if (storeLevel === 2) {
      reasons.push('Seviye 2 (büyüyen) bir mağaza için istem, daha cesur fikirler denemeye ve hangi tasarımların daha iyi sattığını test etmeye alan bırakacak şekilde kurgulandı.')
    } else if (storeLevel === 3) {
      reasons.push('Seviye 3 (oturmuş / güçlü) bir mağaza için ton daha stratejik; marka algısını güçlendiren ve uzun vadeli satış potansiyelini artıran bir konumlandırma hedefliyoruz.')
    }

    if (purchaseIntent === 'gift') {
      reasons.push('Hediye niyetine satın alınacak ürünler için tasarım, duygusal bağ kurmaya ve alıcıya "doğru seçim yaptım" hissi vermeye odaklanır.')
    } else if (purchaseIntent === 'impulse') {
      reasons.push('Anlık satın alma niyetine hitap eden tasarım, dikkat çekici, paylaşılabilir ve "hemen almalıyım" hissi uyandıracak şekilde kurgulanır.')
    } else {
      reasons.push('Kişisel kullanım için tasarım, alıcının kendisiyle özdeşleşebileceği ve uzun süre kullanmak isteyeceği bir estetik sunar.')
    }

    setReasoningLines(reasons)

    // Competitor-aware reasoning (Rakibe Göre Nedenler)
    let competitorSignals: CompetitorSignals | null = null
    if (sessionId && window.electronAPI?.getLatestCompetitorSignals) {
      try {
        const res = await window.electronAPI.getLatestCompetitorSignals(sessionId)
        if (res?.signals && typeof res.signals === 'object') {
          const s = res.signals as Record<string, unknown>
          competitorSignals = {
            title: s.title != null ? String(s.title) : null,
            price: s.price != null ? String(s.price) : null,
            photoCount: typeof s.photoCount === 'number' ? s.photoCount : null,
            rating: s.rating != null ? String(s.rating) : null,
            reviewCount: typeof s.reviewCount === 'number' ? s.reviewCount : null,
            shippingCue: s.shippingCue != null ? String(s.shippingCue) : null,
          }
        }
      } catch {
        competitorSignals = null
      }
    }
    const actionPlan = buildActionPlanGroups(
      { title: parsed?.title ?? null, purchaseIntent },
      competitorSignals,
      auditSignals,
      storeLevel
    )
    setCompetitorReasoningLines(formatActionPlanForDisplay(actionPlan))
    setPrePublishChecklist(buildPrePublishChecklist(actionPlan.yuksek.length > 0 || actionPlan.orta.length > 0 || actionPlan.dusuk.length > 0))
    setVariationPlan(buildVariationPlan(selectedStyles))
  }

  const handleCopy = useCallback(() => {
    if (!promptText) return
    navigator.clipboard.writeText(promptText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [promptText])

  if (!captureId) {
    return (
      <div className="tab-panel">
        <p className="muted">Capture a listing first.</p>
      </div>
    )
  }

  return (
    <div className="tab-panel prompt-studio">
      <section className="prompt-studio-context">
        <h3>Listing Context</h3>
        {loadingParsed ? (
          <p className="muted">Loading listing data…</p>
        ) : (
          <>
            <p className="prompt-studio-context-title">{truncate(listingContext.title, 80)}</p>
            <p className="prompt-studio-context-row"><strong>Niche:</strong> {listingContext.niche}</p>
            <p className="prompt-studio-context-row"><strong>Target audience:</strong> {listingContext.audience}</p>
            <p className="prompt-studio-context-row"><strong>Mood / tone:</strong> {listingContext.mood}</p>
            <p className="prompt-studio-context-row"><strong>Satın alma niyeti:</strong> {purchaseIntent === 'gift' ? 'hediye' : purchaseIntent === 'self' ? 'kendisi için' : 'anlık satın alma'}</p>
          </>
        )}
      </section>

      {hasAuditHints && auditSignals && (
        <section className="prompt-studio-audit-guidance">
          <h3>SEO Audit Insights</h3>
          <ul className="prompt-studio-audit-hints">
            {auditSignals.titleTooLong && <li>Title too long — keep text concise</li>}
            {auditSignals.redundantKeywords && <li>Redundant keywords — avoid repetition</li>}
            {auditSignals.weakStorytelling && <li>Weak storytelling — emphasize emotion</li>}
            {auditSignals.unclearAudience && <li>Unclear audience — make target specific</li>}
          </ul>
        </section>
      )}

      <section>
        <h3>Style (max 2)</h3>
        <ul className="prompt-studio-styles">
          {PROMPT_STYLES.map((style) => (
            <li key={style}>
              <label className="prompt-studio-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStyles.includes(style)}
                  disabled={selectedStyles.length >= MAX_STYLES && !selectedStyles.includes(style)}
                  onChange={() => toggleStyle(style)}
                />
                <span>{style}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Platform</h3>
        <div className="prompt-studio-platform">
          <button
            type="button"
            className={platform === 'canva' ? 'active' : ''}
            onClick={() => setPlatform('canva')}
          >
            Canva
          </button>
          <button
            type="button"
            className={platform === 'ideogram' ? 'active' : ''}
            onClick={() => setPlatform('ideogram')}
          >
            Ideogram
          </button>
        </div>
      </section>

      <section>
        <h3>Mağaza seviyesi</h3>
        <div className="prompt-studio-store-level">
          <button
            type="button"
            className={storeLevel === 1 ? 'active' : ''}
            onClick={() => setStoreLevel(1)}
          >
            Seviye 1: Yeni / küçük
          </button>
          <button
            type="button"
            className={storeLevel === 2 ? 'active' : ''}
            onClick={() => setStoreLevel(2)}
          >
            Seviye 2: Büyüyen
          </button>
          <button
            type="button"
            className={storeLevel === 3 ? 'active' : ''}
            onClick={() => setStoreLevel(3)}
          >
            Seviye 3: Oturmuş / güçlü
          </button>
        </div>
      </section>

      <section>
        <button
          type="button"
          className="btn-primary"
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          Generate Prompt
        </button>
      </section>

      <section className="prompt-studio-output">
        <h3>Prompt Output</h3>
        <textarea
          className="prompt-studio-textarea"
          readOnly
          value={promptText}
          rows={8}
          placeholder="Generated prompt will appear here."
        />
        <div className="prompt-studio-output-actions">
          <span className="prompt-studio-charcount">{promptText.length} characters</span>
          <button type="button" className="btn-copy" onClick={handleCopy} disabled={!promptText}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {hasAuditHints && (
          <p className="prompt-studio-transparency-note">
            Bu istem, SEO denetiminde gördüğümüz eksiklere göre sana yol gösterecek şekilde ayarlandı.
          </p>
        )}
      </section>

      <section className="prompt-studio-reasoning competitor-reasoning">
        <h3>Aksiyon Planı</h3>
        {competitorReasoningLines.length === 0 ? (
          <p className="muted">Önce bir istem üret; aksiyon planı burada görünecek.</p>
        ) : (
          <ul className="action-plan-list">
            {competitorReasoningLines.map((block, idx) => (
              <li key={idx} style={{ whiteSpace: 'pre-line' }}>{block}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="prompt-studio-reasoning pre-publish-checklist">
        <h3>Yayın Öncesi Kontrol Listesi</h3>
        {prePublishChecklist.length === 0 ? (
          <p className="muted">Önce bir istem üret; kontrol listesi burada görünecek.</p>
        ) : (
          <ul className="checklist-list">
            {prePublishChecklist.map((item, idx) => (
              <li key={idx} className="checklist-item">
                <span className="checklist-box" aria-hidden>☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="prompt-studio-reasoning variation-plan">
        <h3>Varyasyon Planı</h3>
        {variationPlan.length === 0 ? (
          <p className="muted">Önce bir istem üret; varyasyon planı burada görünecek.</p>
        ) : (
          <ul className="variation-plan-list">
            {variationPlan.map((block, idx) => (
              <li key={idx} style={{ whiteSpace: 'pre-line' }}>{block}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="prompt-studio-reasoning">
        <h3>İstem mantığı / Neden bu istem</h3>
        {reasoningLines.length === 0 ? (
          <p className="muted">Önce bir istem üret, ardından bu bölümde adım adım mantığını birlikte görelim.</p>
        ) : (
          <ul>
            {reasoningLines.map((line, idx) => (
              <li key={idx}>{line}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

type SessionItem = { id: string; note: string | null; created_at: number }

function formatHistoryTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return sameDay ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function seoStrength(audit: SeoAuditResult): 'High' | 'Medium' | 'Low' {
  const s = audit.strengths.length
  const w = audit.weaknesses.length
  if (s > w) return 'High'
  if (w > s) return 'Low'
  return 'Medium'
}

function HistoryTab({ sessionId, isActive, captures, capturesVersion }: { sessionId: string; isActive: boolean; captures: Capture[]; capturesVersion: number }) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [thumbUrls, setThumbUrls] = useState<Record<string, string | null>>({})
  const [selectedCaptureId, setSelectedCaptureId] = useState<string | null>(null)
  const selectedCaptureIdRef = useRef<string | null>(null)
  const drilldownRef = useRef<HTMLDivElement>(null)
  selectedCaptureIdRef.current = selectedCaptureId
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<unknown>(null)
  const [aiOutput, setAiOutput] = useState<unknown>(null)

  useEffect(() => {
    window.electronAPI?.listSessions().then(setSessions).catch(() => setSessions([]))
  }, [])

  useEffect(() => {
    setThumbUrls({})
    if (captures.length === 0) return
    captures.forEach((c) => {
      window.electronAPI?.getCaptureImage(c.id).then((url) => {
        setThumbUrls((prev) => ({ ...prev, [c.id]: url ?? null }))
      })
    })
  }, [sessionId, captures])

  useEffect(() => {
    if (!selectedCaptureId) {
      setImageUrl(null)
      setParsedData(null)
      setAiOutput(null)
      return
    }
    setImageUrl(null)
    setParsedData(null)
    setAiOutput(null)
    const captureId = selectedCaptureId
    const api = window.electronAPI
    if (!api) return
    api.getCaptureImage(captureId).then((url) => {
      if (selectedCaptureIdRef.current === captureId) setImageUrl(url ?? null)
    })
    api.getParsedListing(captureId).then((data) => {
      if (selectedCaptureIdRef.current === captureId) setParsedData(data ?? null)
    })
    api.getAiOutput(captureId, 'seo_audit').then((data) => {
      if (selectedCaptureIdRef.current === captureId) setAiOutput(data ?? undefined)
    })
  }, [selectedCaptureId])

  useEffect(() => {
    if (selectedCaptureId && drilldownRef.current) {
      drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedCaptureId])

  const summaryFromParsed = (data: unknown) => {
    if (data == null || typeof data !== 'object') return null
    const o = data as Record<string, unknown>
    const title = o.title && typeof o.title === 'string' ? o.title : null
    const price = o.price && typeof o.price === 'string' ? o.price : null
    if (title || price) return [title?.slice(0, 60) + (title && title.length > 60 ? '…' : ''), price].filter(Boolean).join(' · ')
    return null
  }

  const selectedCapture = selectedCaptureId ? captures.find((c) => c.id === selectedCaptureId) : null
  const auditParsed = aiOutput != null ? SeoAuditResultSchema.safeParse(aiOutput) : null
  const strength = auditParsed?.success ? seoStrength(auditParsed.data) : null
  const hasValidAudit = auditParsed?.success === true
  const auditInvalid = aiOutput != null && !auditParsed?.success
  const titleFromParsed = parsedData != null && typeof parsedData === 'object' && typeof (parsedData as Record<string, unknown>).title === 'string'
    ? truncate((parsedData as Record<string, unknown>).title as string, 120)
    : null
  const priceFromParsed = parsedData != null && typeof parsedData === 'object' && typeof (parsedData as Record<string, unknown>).price === 'string'
    ? (parsedData as Record<string, unknown>).price as string
    : null

  return (
    <div className="tab-panel history-tab">
      <h3>Sessions list</h3>
      <ul className="sessions-list">
        {sessions.length === 0 && <li className="muted">No sessions.</li>}
        {sessions.map((s) => (
          <li key={s.id} className={s.id === sessionId ? 'current' : ''}>
            {s.note || s.id}
            {s.id === sessionId ? ' (current)' : ''}
          </li>
        ))}
      </ul>
      <h3>Captures</h3>
      <ul className="captures-list history-capture-rows">
        {captures.length === 0 && <li className="muted">No captures in this session.</li>}
        {captures.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setSelectedCaptureId(c.id)} className={`history-capture-row ${selectedCaptureId === c.id ? 'active' : ''}`}>
              {thumbUrls[c.id] ? (
                <img src={thumbUrls[c.id]!} alt="" className="history-row-thumb" />
              ) : (
                <span className="history-row-thumb-placeholder">…</span>
              )}
              <span className="history-row-url">{truncate(c.url || '', 28)}</span>
              <span className="history-row-time">{formatHistoryTime(c.created_at)}</span>
            </button>
          </li>
        ))}
      </ul>

      {!selectedCaptureId ? (
        <div className="history-detail history-detail-empty">
          <p className="muted">Select a capture to view details.</p>
        </div>
      ) : (
        <div ref={drilldownRef} className="history-detail history-detail-drilldown">
          <h3>Screenshot</h3>
          {imageUrl && <img src={imageUrl} alt="Capture" className="capture-preview-large" />}

          <h3>Capture Summary</h3>
          <div className="history-summary-block">
            {titleFromParsed && <p className="history-summary-title">{titleFromParsed}</p>}
            {priceFromParsed && <p className="history-summary-price">{priceFromParsed}</p>}
            {selectedCapture?.url && <p className="history-summary-url">{truncate(selectedCapture.url, 80)}</p>}
            {selectedCapture && <p className="history-summary-time">{formatHistoryTime(selectedCapture.created_at)}</p>}
            {!titleFromParsed && !priceFromParsed && !selectedCapture?.url && <p className="muted">No summary.</p>}
          </div>

          {strength != null && (
            <>
              <h3>SEO Strength</h3>
              <p className="history-seo-strength">
                <span className={`strength-badge strength-${strength.toLowerCase()}`}>{strength}</span>
              </p>
            </>
          )}

          <h3>SEO Audit Details</h3>
          {!aiOutput && (
            <p className="muted">No SEO audit for this capture. Run SEO Audit to see details.</p>
          )}
          {auditInvalid && (
            <p className="muted">Audit data invalid. Please re-run SEO Audit.</p>
          )}
          {hasValidAudit && auditParsed && (
            <div className="history-audit-sections">
              <section className="history-audit-section">
                <h4>Strengths</h4>
                <ul>{auditParsed.data.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              </section>
              <section className="history-audit-section">
                <h4>Weaknesses</h4>
                <ul>{auditParsed.data.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </section>
              <section className="history-audit-section">
                <h4>Quick Wins</h4>
                <ul>{auditParsed.data.quickWins.map((q, i) => <li key={i}>{q}</li>)}</ul>
              </section>
              <section className="history-audit-section">
                <h4>Title Rewrites</h4>
                <ol>{auditParsed.data.titleRewrites.map((t, i) => <li key={i}>{t}</li>)}</ol>
              </section>
              <section className="history-audit-section">
                <h4>Tags</h4>
                <p className="history-audit-tags-count">{auditParsed.data.tags.length} tags</p>
                <div className="history-audit-tags-pills">
                  {auditParsed.data.tags.map((tag, i) => (
                    <span key={i} className="history-tag-pill">{tag}</span>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MentorChatTab() {
  return (
    <div className="tab-panel">
      <p className="muted">Mentor Chat (placeholder)</p>
    </div>
  )
}

function CompetitorTab({ sessionId }: { sessionId: string }) {
  const [competitorUrl, setCompetitorUrl] = useState<string>('')
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [compStatus, setCompStatus] = useState<string>('')
  const [compError, setCompError] = useState<string>('')
  const [compSignalsCaptured, setCompSignalsCaptured] = useState(false)

  useEffect(() => {
    if (!sessionId || !window.electronAPI) return
    setIsLoading(true)
    window.electronAPI.getCompetitorUrl(sessionId).then((url) => {
      const valid = typeof url === 'string' && url.includes('/listing/')
      setSavedUrl(valid ? url : null)
      setError(null)
      setIsLoading(false)
    }).catch(() => {
      setSavedUrl(null)
      setError(null)
      setIsLoading(false)
    })
  }, [sessionId])

  const handleSet = async () => {
    const trimmed = competitorUrl.trim()
    if (!trimmed || !sessionId || !window.electronAPI) return
    if (!trimmed.includes('/listing/')) {
      setError('Competitor must be a valid Etsy listing URL (/listing/)')
      return
    }
    try {
      await window.electronAPI.setCompetitor({ sessionId, url: trimmed })
      setSavedUrl(trimmed)
      setCompetitorUrl('')
      setError(null)
    } catch (err) {
      console.error('[CompetitorTab] Failed to set competitor:', err)
    }
  }

  const handleClear = async () => {
    if (!sessionId || !window.electronAPI) return
    try {
      await window.electronAPI.clearCompetitor(sessionId)
      setSavedUrl(null)
      setCompetitorUrl('')
      setError(null)
    } catch (err) {
      console.error('[CompetitorTab] Failed to clear competitor:', err)
    }
  }

  useEffect(() => {
    console.log('[competitor] window.ipc', (window as any).ipc)
    console.log('[competitor] window.electronAPI', window.electronAPI)
  }, [])

  const handleCompare = async (e?: React.MouseEvent) => {
    e?.preventDefault?.()
    if (!savedUrl || !sessionId || isCapturing) return

    setCompStatus('Capturing competitor…')
    setCompError('')
    setCompSignalsCaptured(false)
    setIsCapturing(true)
    setError(null)

    try {
      const payload = { sessionId, url: savedUrl }
      const res = await (window as any).ipc?.invoke('competitor:capture', payload)
      if (!res?.ok) {
        setCompError(res?.error || 'Capture failed')
        setCompStatus('')
      } else {
        setCompStatus('Captured ✓')
        setCompSignalsCaptured(!!res?.signals)
      }
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Capture failed')
      setCompStatus('')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <div className="tab-panel">
      <section>
        <h3>Competitor URL</h3>
        <input
          type="text"
          className="competitor-url-input"
          value={competitorUrl}
          onChange={(e) => setCompetitorUrl(e.target.value)}
          placeholder="https://www.etsy.com/listing/..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSet()
          }}
        />
        {error && <p className="competitor-error">{error}</p>}
        <div className="competitor-actions">
          <button type="button" className="btn-primary" onClick={handleSet} disabled={!competitorUrl.trim()}>
            Set Competitor
          </button>
          <button type="button" className="btn-secondary" onClick={handleClear} disabled={!savedUrl}>
            Clear
          </button>
        </div>
      </section>
      <section>
        {isLoading ? (
          <p className="muted">Loading...</p>
        ) : savedUrl ? (
          <p className="competitor-display">
            <strong>Selected competitor:</strong> <span className="competitor-url-display">{savedUrl.length > 60 ? savedUrl.slice(0, 60) + '…' : savedUrl}</span>
          </p>
        ) : (
          <p className="muted">No competitor selected.</p>
        )}
      </section>
      <section>
        {(() => {
          const isValidSaved = !!savedUrl && savedUrl.includes('/listing/')
          return (
            <>
              <button
                type="button"
                className="btn-primary"
                disabled={!isValidSaved || isCapturing}
                onClick={handleCompare}
                title={isValidSaved ? 'Compare with competitor' : 'Select a valid Etsy listing URL first'}
              >
                {isCapturing ? 'Capturing…' : 'Compare'}
              </button>
              {compStatus && <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#0d7377' }}>{compStatus}</p>}
              {compSignalsCaptured && <p style={{ marginTop: 4, fontSize: '0.85rem', color: '#0d7377' }}>Signals captured ✓</p>}
              {compError && <p style={{ marginTop: 8, fontSize: '0.9rem', color: '#ff6b6b' }}>{compError}</p>}
            </>
          )
        })()}
      </section>
    </div>
  )
}
