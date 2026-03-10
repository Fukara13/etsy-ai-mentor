import { useState } from 'react'
import type { Store } from '../types'

type Props = {
  store: Store
  onEnterStore: (store: Store) => void
}

const LEVEL_LABELS: Record<string, string> = {
  Beginner: 'Yeni',
  Growing: 'Büyüyen',
  Stable: 'Oturmuş',
  Risky: 'Riskli',
}

export default function StoreCard({ store, onEnterStore }: Props) {
  const [showProfile, setShowProfile] = useState(false)
  const levelLabel = LEVEL_LABELS[store.level] ?? store.level
  const nicheSummary = [store.niche_theme, store.niche_emotion, store.niche_buyer].filter(Boolean).join(' · ') || '—'

  return (
    <div className="store-card">
      <h3 className="store-card-name">{store.name}</h3>
      <p className="store-card-niche">{nicheSummary}</p>
      <div className="store-card-meta">
        <span className={`store-card-level store-card-level--${store.level.toLowerCase()}`}>{levelLabel}</span>
        <span className="store-card-tasks">Aktif görev: 0</span>
      </div>
      <div className="store-card-actions">
        <button type="button" className="btn-primary" onClick={() => onEnterStore(store)}>
          Enter Store
        </button>
        <button type="button" className="btn-secondary" onClick={() => setShowProfile(true)}>
          Profile
        </button>
      </div>
      {showProfile && (
        <div className="store-card-profile-modal" role="dialog" aria-label="Store profile">
          <div className="store-card-profile-backdrop" onClick={() => setShowProfile(false)} />
          <div className="store-card-profile-panel">
            <h4>Profile — {store.name}</h4>
            <p className="muted">Placeholder. Profile content will be added in a later gate.</p>
            <button type="button" className="btn-secondary" onClick={() => setShowProfile(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
