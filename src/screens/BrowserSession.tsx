import { useState, useEffect, useCallback, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import BrowserPane from '../components/BrowserPane'
import type { Capture } from '../types'

type Props = {
  sessionId: string
  getCurrentSessionId: () => string
  onBack: () => void
  onSettings: () => void
}

type Toast = { message: string; type: 'success' | 'error' }

export default function BrowserSession({ sessionId, getCurrentSessionId, onBack, onSettings }: Props) {
  const [url, setUrl] = useState('https://www.etsy.com')
  const [currentUrl, setCurrentUrl] = useState('')
  const [currentCaptureId, setCurrentCaptureId] = useState<string | null>(null)
  const [auditVersion, setAuditVersion] = useState(0)
  const [note, setNote] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const isCapturingRef = useRef(false)
  const sessionIdRef = useRef(sessionId)
  const refreshCapturesRef = useRef<((sessionId: string, rows: Capture[]) => void) | null>(null)
  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])
  const api = window.electronAPI

  const isListingUrl = currentUrl.includes('/listing/')

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleGo = useCallback(() => {
    api?.navGo(url)
  }, [api, url])

  useEffect(() => {
    api?.createSession(sessionId)
  }, [api, sessionId])

  useEffect(() => {
    api?.navGo?.(url)
  }, [api])

  useEffect(() => {
    api?.getSession(sessionId).then((s) => {
      setNote(s?.note ?? '')
    })
  }, [api, sessionId])

  const handleNoteBlur = useCallback(() => {
    api?.updateSessionNote(sessionId, note.trim())
  }, [api, sessionId, note])

  const handleCapture = useCallback(() => {
    if (isCapturingRef.current || isCapturing) return
    if (!api) return
    const currentSessionId = sessionIdRef.current || getCurrentSessionId()
    if (!currentSessionId) {
      showToast('No session. Start a session first.', 'error')
      return
    }
    console.log('[ui] capture click', { currentSessionId, url: currentUrl })
    isCapturingRef.current = true
    setIsCapturing(true)
    api.captureCreate({ sessionId: currentSessionId }).then((result) => {
      if (result) {
        setCurrentCaptureId(result.captureId)
        showToast('Capture saved', 'success')
        console.log('[ui] capture:create success -> refreshing captures', { sessionId: currentSessionId, ts: Date.now() })
        const api2 = window.electronAPI
        if (api2) {
          api2.listCaptures(currentSessionId).then((rows: Capture[]) => {
            console.log('[ui] listCaptures after capture', rows.length)
            refreshCapturesRef?.current?.(currentSessionId, rows)
          })
        } else {
          refreshCapturesRef?.current?.(currentSessionId, [])
        }
      } else {
        showToast('Capture failed', 'error')
      }
    }).catch(() => {
      showToast('Capture failed', 'error')
    }).finally(() => {
      isCapturingRef.current = false
      setIsCapturing(false)
    })
  }, [api, getCurrentSessionId, showToast, isCapturing])

  useEffect(() => {
    const unsub = api?.onCaptureCreated?.((data) => {
      if (data.sessionId === sessionId) setCurrentCaptureId(data.captureId)
    })
    return () => unsub?.()
  }, [api, sessionId])

  useEffect(() => {
    const unsub = api?.onCaptureFailed?.((errorMessage: string) => showToast(errorMessage, 'error'))
    return () => unsub?.()
  }, [api, showToast])

  useEffect(() => {
    const unsub = api?.onUrlChanged?.((u: string) => {
      setCurrentUrl(u)
      setUrl(u)
      setCurrentCaptureId(null)
    })
    return () => unsub?.()
  }, [api])

  return (
    <div className="browser-layout">
      <div className="browser-top-bar">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <input
          type="text"
          className="url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGo()}
          placeholder="https://www.etsy.com/listing/..."
        />
        <button type="button" className="btn-go" onClick={handleGo}>
          Go
        </button>
        <button type="button" className="btn-capture" onClick={handleCapture} disabled={isCapturing}>
          {isCapturing ? 'Capturing…' : 'Capture'}
        </button>
        <input
          type="text"
          className="note-input"
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={handleNoteBlur}
        />
        <button
          type="button"
          className="btn-analyze"
          disabled={!currentCaptureId || !isListingUrl || isAnalyzing}
          onClick={() => {
            if (!currentCaptureId || !api) return
            setIsAnalyzing(true)
            api.analyzeCapture(currentCaptureId).then((result) => {
              setIsAnalyzing(false)
              if (result.ok) {
                setAuditVersion((v) => v + 1)
              } else {
                showToast(result.errorMessage, 'error')
              }
            }).catch(() => {
              setIsAnalyzing(false)
              showToast('Audit failed.', 'error')
            })
          }}
        >
          {isAnalyzing ? 'Analyzing…' : 'Analyze'}
        </button>
        <button type="button" className="btn-settings" onClick={onSettings}>
          Settings
        </button>
      </div>
      <div className="browser-content">
        <BrowserPane />
        <Sidebar
          sessionId={sessionId}
          refreshCapturesRef={refreshCapturesRef}
          captureId={currentCaptureId}
          auditVersion={auditVersion}
          currentUrl={currentUrl}
          isListingUrl={isListingUrl}
          onAuditError={(msg) => showToast(msg, 'error')}
        />
      </div>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
