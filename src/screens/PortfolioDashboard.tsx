import { useState, useEffect, useRef, useCallback } from 'react'
import StoreCard from '../components/StoreCard'
import MentorPanel, { type ChatMessage } from '../components/MentorPanel'
import type { Store } from '../types'

/** Gate 2: Daily Mentor Brief — 3 lines: status (neutral), risk/none, safest next step. Turkish, no guarantees. */
function buildDailyBrief(_store: Store): string {
  const line1 = 'Bu mağaza şu an listede; canlı veri veya analiz henüz yok.'
  const line2 = 'Ek belirsizlik yok; sadece hedefi netleştirmek faydalı olur.'
  const line3 = 'En güvenli adım: hedefini tek cümleyle yazmak, ardından modüllere geçmek.'
  return [line1, line2, line3].join('\n')
}

function isGenericGoal(text: string): boolean {
  const lower = text.toLowerCase()
  const patterns = ['daha çok satış', 'daha fazla satış', 'satış', 'trend', 'başarılı olmak', 'para kazanmak']
  return patterns.some((p) => lower.includes(p))
}

function isOneSentence(text: string): boolean {
  const trimmed = text.trim()
  const matches = trimmed.match(/[.!?]/g)
  return !matches || matches.length <= 1
}

function isValidGoal(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length < 5) return false
  if (!isOneSentence(text)) return false
  if (isGenericGoal(text)) return false
  return true
}

type Props = {
  onSettings?: () => void
}

type Gate7CapturePersisted = {
  snapshot: { id: string; listing_url: string; title_text: string | null; description_text: string | null; tags: string[]; image_count: number | null; created_at: number }
  storeId: number
}
let gate7CapturePersisted: Gate7CapturePersisted | null = null

export default function PortfolioDashboard({ onSettings }: Props) {
  const [stores, setStores] = useState<Store[]>([])
  const [mentorSilent, setMentorSilent] = useState(true)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [goalMode, setGoalMode] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [moduleGuidanceStoreIds, setModuleGuidanceStoreIds] = useState<number[]>([])
  const [confirmModule, setConfirmModule] = useState<'seo' | 'prompt' | 'history' | null>(null)
  const [activeModule, setActiveModule] = useState<'seo' | 'prompt' | 'history' | null>(null)
  // Gate 7: SEO module listing capture (neutral only; mentor silent)
  const [seoCapturePhase, setSeoCapturePhase] = useState<'idle' | 'browser_open' | 'captured'>('idle')
  const [lastListingSnapshot, setLastListingSnapshot] = useState<{
    id: string
    listing_url: string
    title_text: string | null
    description_text: string | null
    tags: string[]
    image_count: number | null
    created_at: number
  } | null>(null)

  useEffect(() => {
    window.electronAPI?.listStores?.().then((list) => setStores(Array.isArray(list) ? list : [])).catch(() => setStores([]))
  }, [])

  // Restore Gate 7 captured state after remount (e.g. Strict Mode) so “Liste tanındı” and module context are not lost
  const hasRestoredGate7Ref = useRef(false)
  useEffect(() => {
    if (hasRestoredGate7Ref.current) return
    const persisted = gate7CapturePersisted
    if (!persisted || stores.length === 0) return
    const store = stores.find((s) => s.id === persisted.storeId)
    if (!store) return
    console.log('[nav] restoring Gate 7 context from persisted (no automatic transition)')
    hasRestoredGate7Ref.current = true
    gate7CapturePersisted = null
    setLastListingSnapshot(persisted.snapshot)
    setSeoCapturePhase('captured')
    setActiveModule('seo')
    setSelectedStore(store)
  }, [stores])

  // Lightweight nav log: dashboard context changes (who might reset to “dashboard” view)
  useEffect(() => {
    console.log('[nav] dashboard context', { selectedStoreId: selectedStore?.id ?? null, activeModule, seoCapturePhase })
  }, [selectedStore, activeModule, seoCapturePhase])

  // Gate 7: when main process auto-captures a listing, show confirmation only; do NOT close or navigate BrowserView (user stays on listing until "Geri Dön")
  const selectedStoreIdRef = useRef(selectedStore?.id ?? null)
  selectedStoreIdRef.current = selectedStore?.id ?? null
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onGate7ListingCaptured?.(snapshot => {
      const storeId = selectedStoreIdRef.current
      console.log('[nav] gate7 listingCaptured received; setting captured state only (no view change)')
      if (storeId != null) gate7CapturePersisted = { snapshot, storeId }
      setLastListingSnapshot(snapshot)
      setSeoCapturePhase('captured')
      // Do not sendAppView('dashboard') here — BrowserView must stay on the listing page
    })
    return () => unsubscribe?.()
  }, [])

  const handleEnterStore = (store: Store) => {
    if (selectedStore?.id === store.id) return
    setSelectedStore(store)
    setMentorSilent(false)
    setMessages((prev) => [
      ...prev,
      {
        id: 'brief_' + Date.now(),
        role: 'mentor',
        text: buildDailyBrief(store),
        isDailyBrief: true,
      },
    ])
    setGoalMode(false)
    setGoalDraft(store.active_goal ?? '')
    setConfirmModule(null)
    setActiveModule(null)
    setSeoCapturePhase('idle')
    setLastListingSnapshot(null)
  }

  const handleSendMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: 'user_' + Date.now(), role: 'user', text },
    ])
  }

  const handleOpenGoal = () => {
    if (!selectedStore) return
    setGoalDraft(selectedStore.active_goal ?? '')
    setGoalMode(true)
  }

  const handleGoalCancel = () => {
    setGoalMode(false)
  }

  const handleGoalSave = async () => {
    if (!selectedStore) return
    const trimmed = goalDraft.trim()
    if (!isValidGoal(trimmed)) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'goal_invalid_' + Date.now(),
          role: 'mentor',
          text: 'Bu hedef net değil. Tek cümlede, ölçülebilir şekilde yaz.',
        },
      ])
      setGoalMode(true)
      return
    }
    try {
      await window.electronAPI?.updateStoreGoal?.(selectedStore.id, trimmed)
      setStores((prev) =>
        prev.map((s) => (s.id === selectedStore.id ? { ...s, active_goal: trimmed } : s)),
      )
      setSelectedStore((prev) => (prev ? { ...prev, active_goal: trimmed } : prev))
      setGoalMode(false)
      setMessages((prev) => [
        ...prev,
        {
          id: 'goal_saved_' + Date.now(),
          role: 'mentor',
          text: 'Hedef kaydedildi. İleride bu hedefe göre ilerleyeceğiz.',
        },
      ])
    } catch {
      // minimal: no extra error messaging for Gate 3
    }
  }

  const handleOpenModules = () => {
    if (!selectedStore) return
    if (moduleGuidanceStoreIds.includes(selectedStore.id)) return
    const goal = selectedStore.active_goal && selectedStore.active_goal.trim()
    const statusLine = goal
      ? `Aktif hedefin: “${goal}”.`
      : 'Bu mağaza için henüz net bir hedef kaydedilmedi; öneriler genel tutulacak.'
    const suggestionLine =
      'Bu hedef için önce SEO Audit ve Prompt Studio modüllerini açman, sırasıyla listeyi ve görsel/prompt yönünü daha net görmene yardımcı olabilir.'
    const text = [statusLine, suggestionLine].join('\n')
    setMessages((prev) => [
      ...prev,
      {
        id: 'modules_' + Date.now(),
        role: 'mentor',
        text,
      },
    ])
    setModuleGuidanceStoreIds((prev) =>
      prev.includes(selectedStore.id) ? prev : [...prev, selectedStore.id],
    )
  }

  const handleModuleConfirmRequest = (moduleId: 'seo' | 'prompt' | 'history') => {
    if (!selectedStore) return
    // Do not duplicate confirmation for the same module while it's active
    if (confirmModule === moduleId) return
    setConfirmModule(moduleId)
  }

  const handleModuleConfirmCancel = () => {
    if (seoCapturePhase === 'browser_open' || seoCapturePhase === 'captured') {
      window.electronAPI?.gate7CloseBrowser?.()
    }
    gate7CapturePersisted = null
    setConfirmModule(null)
    setActiveModule(null)
    setSeoCapturePhase('idle')
    setLastListingSnapshot(null)
    window.electronAPI?.sendAppView?.('dashboard')
  }

  const handleModuleConfirmContinue = () => {
    const which = confirmModule
    if (!which) return
    setConfirmModule(null)
    setActiveModule(which)
    setMessages((prev) => [
      ...prev,
      {
        id: 'module_continue_' + Date.now(),
        role: 'mentor',
        text: 'Tamam. Bir sonraki adımda modülü başlatacağız.',
      },
    ])
  }

  // Gate 7: open browser to Etsy (store-silent; no interpretation)
  const handleSeoStartAnalysis = () => {
    if (!selectedStore) return
    setSeoCapturePhase('browser_open')
    window.electronAPI?.sendAppView?.('gate7')
    console.log('IPC channel invoked:', 'gate7:setContext')
    window.electronAPI?.gate7SetContext?.({ storeId: selectedStore.id })
  }

  const handleSeoCaptureListing = async () => {
    if (!selectedStore) return
    const result = await window.electronAPI?.gate7CaptureListing?.(selectedStore.id)
    if (!result) return
    if (!result.ok) {
      // Neutral feedback only: e.g. not a listing page
      setSeoCapturePhase('browser_open')
      return
    }
    setLastListingSnapshot(result.snapshot)
    setSeoCapturePhase('captured')
  }

  const handleSeoBackToModule = useCallback(() => {
    gate7CapturePersisted = null
    setSeoCapturePhase('idle')
    setLastListingSnapshot(null)
    try {
      if (window.electronAPI?.gate7CloseBrowser) {
        window.electronAPI.gate7CloseBrowser()
      }
    } catch (_e) {
      // State already updated; Module Screen will show
    }
  }, [])

  return (
    <div className="portfolio-dashboard">
      <header className="dashboard-header">
        <h1>Etsy Mentor</h1>
        {onSettings && (
          <button type="button" className="btn-secondary" onClick={onSettings}>
            Settings
          </button>
        )}
      </header>
      <div className="dashboard-body">
        <main className="dashboard-stores">
          <h2 className="dashboard-stores-title">Mağazalar</h2>
          <div className="store-cards">
            {stores.length === 0 && <p className="muted">Mağaza yükleniyor…</p>}
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} onEnterStore={handleEnterStore} />
            ))}
          </div>
        </main>
        <MentorPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          mentorSilent={mentorSilent}
          goalMode={goalMode}
          goalDraft={goalDraft}
          activeGoal={selectedStore?.active_goal ?? null}
          showModules={
            !!selectedStore && moduleGuidanceStoreIds.includes(selectedStore.id)
          }
          onOpenGoal={handleOpenGoal}
          onOpenModules={handleOpenModules}
          confirmModule={confirmModule}
          onRequestModuleConfirm={handleModuleConfirmRequest}
          onModuleConfirmContinue={handleModuleConfirmContinue}
          onModuleConfirmCancel={handleModuleConfirmCancel}
          activeModule={activeModule}
          seoCapturePhase={seoCapturePhase}
          lastListingSnapshot={lastListingSnapshot}
          onSeoStartAnalysis={handleSeoStartAnalysis}
          onSeoCaptureListing={handleSeoCaptureListing}
          onSeoBackToModule={handleSeoBackToModule}
          onGoalDraftChange={setGoalDraft}
          onGoalSave={handleGoalSave}
          onGoalCancel={handleGoalCancel}
        />
      </div>
    </div>
  )
}
