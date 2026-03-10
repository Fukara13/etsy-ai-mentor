import { useState, useEffect, useRef } from 'react'
import Home from './screens/Home'
import PortfolioDashboard from './screens/PortfolioDashboard'
import BrowserSession from './screens/BrowserSession'
import Settings from './screens/Settings'
import './index.css'

type View = 'dashboard' | 'home' | 'session' | 'settings'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [previousView, setPreviousView] = useState<View | null>(null)
  const [gateBlockedMessage, setGateBlockedMessage] = useState<string | null>(null)
  const currentSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsub = window.electronAPI?.onGateBlocked?.((payload) => {
      setGateBlockedMessage(payload.message || 'Gate blocked')
    })
    return () => { unsub?.() }
  }, [])

  useEffect(() => {
    if (!gateBlockedMessage) return
    const t = setTimeout(() => setGateBlockedMessage(null), 5000)
    return () => clearTimeout(t)
  }, [gateBlockedMessage])

  // Only sync view to main when it's not dashboard; dashboard sends 'dashboard' itself on "Geri Dön" so Gate 7 BrowserView is not closed by effect re-runs
  useEffect(() => {
    if (view === 'dashboard') return
    console.log('[nav] renderer view sync →', view)
    window.electronAPI?.sendAppView?.(view)
  }, [view])

  useEffect(() => {
    console.log('[ui] currentSessionId changed', sessionId)
  }, [sessionId])

  useEffect(() => {
    if (view === 'session' && (currentSessionIdRef.current ?? sessionId)) {
      console.log('[ui] currentSessionId (session view)', currentSessionIdRef.current ?? sessionId)
    }
  }, [view, sessionId])

  const handleNewSession = () => {
    const id = 'sess_' + Date.now()
    currentSessionIdRef.current = id
    console.log('[session] currentSessionId set to', id)
    setSessionId(id)
    console.log('[nav] renderer setView → session')
    setView('session')
  }

  const handleOpenSession = (id: string) => {
    currentSessionIdRef.current = id
    setSessionId(id)
    console.log('[nav] renderer setView → session')
    setView('session')
  }

  const handleBackToHome = () => {
    currentSessionIdRef.current = null
    setSessionId(null)
    console.log('[nav] renderer setView → home')
    setView('home')
  }

  const openSettings = () => {
    setPreviousView(view)
    console.log('[nav] renderer setView → settings')
    setView('settings')
  }
  const closeSettings = () => {
    const next = previousView ?? 'home'
    console.log('[nav] renderer setView →', next)
    setView(next)
    setPreviousView(null)
  }

  const getCurrentSessionId = () => currentSessionIdRef.current ?? sessionId ?? ''

  const mainContent =
    view === 'settings' ? (
      <Settings onClose={closeSettings} />
    ) : view === 'dashboard' ? (
      <PortfolioDashboard onSettings={openSettings} />
    ) : view === 'home' ? (
      <Home
        onNewSession={handleNewSession}
        onOpenSession={handleOpenSession}
        onSettings={openSettings}
      />
    ) : view === 'session' && sessionId ? (
      (() => {
        const activeSessionId = currentSessionIdRef.current ?? sessionId
        return activeSessionId ? (
          <BrowserSession
            sessionId={activeSessionId}
            getCurrentSessionId={getCurrentSessionId}
            onBack={handleBackToHome}
            onSettings={openSettings}
          />
        ) : null
      })()
    ) : view === 'session' ? (
      <div className="app-loading">Loading session…</div>
    ) : (
      <Home
        onNewSession={handleNewSession}
        onOpenSession={handleOpenSession}
        onSettings={openSettings}
      />
    )

  return (
    <div className="app-root">
      {gateBlockedMessage && (
        <div className="toast toast-error" style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
          {gateBlockedMessage}
        </div>
      )}
      {mainContent}
    </div>
  )
}

export default App
