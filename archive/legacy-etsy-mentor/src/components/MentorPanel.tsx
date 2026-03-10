import { useState } from 'react'

export type ChatMessage = {
  id: string
  role: 'mentor' | 'user'
  text: string
  /** Gate 2: Daily Brief — show action buttons below this message */
  isDailyBrief?: boolean
}

type Props = {
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  mentorSilent: boolean
  // Gate 3: goal input is controlled by parent
  goalMode: boolean
  goalDraft: string
  activeGoal: string | null
  // Gate 4: whether module cards should be visible (after Modülleri Aç tetiklenir)
  showModules: boolean
  onOpenGoal: () => void
  onOpenModules: () => void
  // Gate 5: pre-module confirmation flow
  confirmModule: 'seo' | 'prompt' | 'history' | null
  onRequestModuleConfirm: (moduleId: 'seo' | 'prompt' | 'history') => void
  onModuleConfirmContinue: () => void
  onModuleConfirmCancel: () => void
  // Gate 6: active module (if any)
  activeModule?: 'seo' | 'prompt' | 'history' | null
  // Gate 7: SEO neutral listing capture (store-silent)
  seoCapturePhase?: 'idle' | 'browser_open' | 'captured'
  lastListingSnapshot?: {
    id: string
    listing_url: string
    title_text: string | null
    description_text: string | null
    tags: string[]
    image_count: number | null
    created_at: number
  } | null
  onSeoStartAnalysis?: () => void
  onSeoCaptureListing?: () => void
  onSeoBackToModule?: () => void
  onGoalDraftChange: (text: string) => void
  onGoalSave: () => void
  onGoalCancel: () => void
}

type TabId = 'chat' | 'tasks' | 'history'

export default function MentorPanel({
  messages,
  onSendMessage,
  mentorSilent,
  goalMode,
  goalDraft,
  activeGoal,
  showModules,
  onOpenGoal,
  onOpenModules,
  confirmModule,
  onRequestModuleConfirm,
  onModuleConfirmContinue,
  onModuleConfirmCancel,
  activeModule,
  seoCapturePhase = 'idle',
  lastListingSnapshot = null,
  onSeoStartAnalysis,
  onSeoCaptureListing,
  onSeoBackToModule,
  onGoalDraftChange,
  onGoalSave,
  onGoalCancel,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [inputValue, setInputValue] = useState('')
  // Gate 6: safe derived value, default to null when not provided
  const moduleId: 'seo' | 'prompt' | 'history' | null = activeModule ?? null

  const handleSend = () => {
    const t = inputValue.trim()
    if (!t) return
    onSendMessage(t)
    setInputValue('')
  }

  return (
    <aside className="mentor-panel">
      <div className="mentor-panel-tabs">
        <button
          type="button"
          className={activeTab === 'chat' ? 'active' : ''}
          onClick={() => setActiveTab('chat')}
        >
          Chat
        </button>
        <button
          type="button"
          className={activeTab === 'tasks' ? 'active' : ''}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          type="button"
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {activeTab === 'chat' && (
        <div className="mentor-panel-chat">
          {/* Gate 6: if a module is active, show dedicated module screen instead of chat */}
          {moduleId ? (
            <div className="mentor-module-screen">
              <h3 className="mentor-module-title">
                {moduleId === 'seo'
                  ? 'SEO Audit'
                  : moduleId === 'prompt'
                  ? 'Prompt Studio'
                  : 'History'}
              </h3>
              {/* Gate 7: SEO captured state — facts only, no interpretation */}
              {moduleId === 'seo' && seoCapturePhase === 'captured' && lastListingSnapshot ? (
                <>
                  <p className="mentor-module-info">Liste tanındı. Mağaza yorumu henüz yapılmadı.</p>
                  <dl className="mentor-listing-facts">
                    <dt>URL</dt>
                    <dd>{lastListingSnapshot.listing_url}</dd>
                    {lastListingSnapshot.title_text != null && lastListingSnapshot.title_text !== '' && (
                      <>
                        <dt>Başlık</dt>
                        <dd>{lastListingSnapshot.title_text}</dd>
                      </>
                    )}
                    {lastListingSnapshot.description_text != null && lastListingSnapshot.description_text !== '' && (
                      <>
                        <dt>Açıklama</dt>
                        <dd>{lastListingSnapshot.description_text.length > 200 ? lastListingSnapshot.description_text.slice(0, 200) + '…' : lastListingSnapshot.description_text}</dd>
                      </>
                    )}
                    {Array.isArray(lastListingSnapshot.tags) && lastListingSnapshot.tags.length > 0 && (
                      <>
                        <dt>Etiketler</dt>
                        <dd>{lastListingSnapshot.tags.join(', ')}</dd>
                      </>
                    )}
                    {lastListingSnapshot.image_count != null && (
                      <>
                        <dt>Görsel sayısı</dt>
                        <dd>{lastListingSnapshot.image_count}</dd>
                      </>
                    )}
                  </dl>
                  <div className="mentor-module-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onSeoBackToModule?.()}
                    >
                      Geri Dön
                    </button>
                  </div>
                </>
              ) : moduleId === 'seo' && seoCapturePhase === 'browser_open' ? (
                <>
                  <p className="mentor-module-info">Tarayıcıda bir liste sayfasına gidin. Liste tanındığında bilgiler burada görünecek.</p>
                  <div className="mentor-module-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => onSeoBackToModule?.()}
                    >
                      Geri Dön
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="mentor-module-info">
                    {moduleId === 'seo' &&
                      'Bu ekran, ilanını başlık ve temel yapı açısından düşünmen için ayrılmıştır. Şu anda otomatik analiz, skor veya garanti edilen bir sonuç yok; sadece not almak ve sonraki adımları planlamak için kullanılabilir.'}
                    {moduleId === 'prompt' &&
                      'Bu ekran, hedefinle uyumlu görsel ve prompt fikirlerini düzenlemek için tasarlanmıştır. Şu anda otomatik görsel üretim veya satış garantisi yok; sadece kontrollü varyasyon ve fikir toplama alanıdır.'}
                    {moduleId === 'history' &&
                      'Bu ekran, geçmiş oturumlarını ve denemelerini sakince gözden geçirmen içindir. Şu anda otomatik rapor, öneri veya karar mekanizması yok; sadece ne yaptığını hatırlamana yardımcı olur.'}
                  </p>
                  <div className="mentor-module-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={moduleId !== 'seo'}
                      onClick={moduleId === 'seo' ? onSeoStartAnalysis : undefined}
                    >
                      Analizi Başlat
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onModuleConfirmCancel}
                    >
                      Geri Dön
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
          <div className="mentor-panel-messages">
            {mentorSilent && messages.length === 0 && (
              <p className="mentor-panel-silent muted">Mentor sessiz. Bir mağazaya girmek için sol taraftan &quot;Enter Store&quot; seçin.</p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`mentor-panel-message mentor-panel-message--${m.role}`}>
                <span className="mentor-panel-message-role">{m.role === 'mentor' ? 'Mentor' : 'Sen'}</span>
                <p className="mentor-panel-message-text">{m.text}</p>
                {m.isDailyBrief && (
                  <div className="mentor-panel-brief-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onOpenGoal}
                    >
                      {activeGoal ? 'Hedefi Güncelle' : 'Hedefi Netleştir'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={onOpenModules}
                    >
                      Modülleri Aç
                    </button>
                  </div>
                )}
              </div>
            ))}
            {activeGoal && !goalMode && (
              <div className="mentor-goal-active">
                🎯 Aktif hedef: {activeGoal}
              </div>
            )}
            {/* Gate 5: pre-module confirmation message / buttons */}
            {confirmModule && (
              <div className="mentor-module-confirm">
                <p className="mentor-module-confirm-text">
                  {confirmModule === 'seo' &&
                    'SEO Audit, ilanını başlık, metin ve temel yapı açısından birlikte gözden geçirmemize yardımcı olur. Otomatik sonuç veya garanti vermez; sadece yol gösterir. Bu modülle devam etmek istiyor musun?'}
                  {confirmModule === 'prompt' &&
                    'Prompt Studio, görsel/prompt fikirlerini hedefinle uyumlu şekilde denemeni sağlar. Çıktılar garanti değil; sadece seçenekleri görmene yardımcı olur. Bu modülle devam etmek istiyor musun?'}
                  {confirmModule === 'history' &&
                    'History, geçmiş oturumlarını ve denemelerini hedefinle birlikte geriye dönük görmene imkân verir. Buradan alınan kararlar tek başına başarı garantilemez. Bu modülle devam etmek istiyor musun?'}
                </p>
                <div className="mentor-module-confirm-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onModuleConfirmContinue}
                  >
                    Devam Et
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={onModuleConfirmCancel}
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            )}
            {/* Gate 4: module cards UI (placeholder only). Shown only when explicitly triggered. */}
            {showModules && (
              <div className="mentor-modules">
                <div className="mentor-module-card">
                  <h4>SEO Audit</h4>
                  <p>Listeyi hedefinle uyumlu mu diye teknik açıdan görmene yardımcı olur.</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onRequestModuleConfirm('seo')}
                  >
                    Aç
                  </button>
                </div>
                <div className="mentor-module-card">
                  <h4>Prompt Studio</h4>
                  <p>Hedefe uygun görsel/prompt fikirlerini kontrollü şekilde denemene yardımcı olur.</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onRequestModuleConfirm('prompt')}
                  >
                    Aç
                  </button>
                </div>
                <div className="mentor-module-card">
                  <h4>History</h4>
                  <p>Geçmiş oturumları hedefinle birlikte geriye dönük görmeni sağlar.</p>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onRequestModuleConfirm('history')}
                  >
                    Aç
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
          {!moduleId && goalMode && (
            <div className="mentor-goal-block">
              <p className="mentor-goal-prompt">Bu mağaza için tek cümlelik hedefini yaz.</p>
              <textarea
                className="mentor-goal-textarea"
                rows={3}
                value={goalDraft}
                onChange={(e) => onGoalDraftChange(e.target.value)}
                placeholder="Örnek: 30 gün içinde 10 satışa ulaşmak."
              />
              <div className="mentor-goal-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={onGoalSave}
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onGoalCancel}
                >
                  İptal
                </button>
              </div>
            </div>
          )}
          {!moduleId && (
            <div className="mentor-panel-input-row">
              <input
                type="text"
                className="mentor-panel-input"
                placeholder="Mesaj yaz..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <button type="button" className="btn-primary" onClick={handleSend}>
                Gönder
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="mentor-panel-placeholder">
          <p className="muted">Tasks — placeholder. Gate 1’de görev oluşturulmaz.</p>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="mentor-panel-placeholder">
          <p className="muted">History — placeholder.</p>
        </div>
      )}
    </aside>
  )
}
