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
  const currentSessionIdRef = useRef<string | null>(null)

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

  if (view === 'settings') {
    return <Settings onClose={closeSettings} />
  }

  if (view === 'dashboard') {
    return <PortfolioDashboard onSettings={openSettings} />
  }

  if (view === 'home') {
    return (
      <Home
        onNewSession={handleNewSession}
        onOpenSession={handleOpenSession}
        onSettings={openSettings}
      />
    )
  }

  const getCurrentSessionId = () => currentSessionIdRef.current ?? sessionId ?? ''

  if (view === 'session' && sessionId) {
    const activeSessionId = currentSessionIdRef.current ?? sessionId
    if (activeSessionId) {
      return (
        <BrowserSession
          sessionId={activeSessionId}
          getCurrentSessionId={getCurrentSessionId}
          onBack={handleBackToHome}
          onSettings={openSettings}
        />
      )
    }
  }

  if (view === 'session') {
    return <div className="app-loading">Loading session…</div>
  }

  return (
    <Home
      onNewSession={handleNewSession}
      onOpenSession={handleOpenSession}
      onSettings={openSettings}
    />
  )
}

export default App
