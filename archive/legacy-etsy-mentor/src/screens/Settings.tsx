import { useState, useEffect } from 'react'

type Props = {
  onClose: () => void
}

export default function Settings({ onClose }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    window.electronAPI?.getSetting('openai_api_key').then((v) => {
      setApiKey(typeof v === 'string' ? v : '')
    }).catch(() => {})
  }, [])

  const handleSave = () => {
    window.electronAPI?.setSetting('openai_api_key', apiKey.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData?.getData?.('text/plain') ?? e.clipboardData?.getData?.('text') ?? ''
    if (text) {
      e.preventDefault()
      const el = e.currentTarget
      const start = el.selectionStart ?? apiKey.length
      const end = el.selectionEnd ?? apiKey.length
      setApiKey(apiKey.slice(0, start) + text + apiKey.slice(end))
    }
  }

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <h1>Settings</h1>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </header>
      <main className="settings-main">
        <label htmlFor="settings-openai-api-key">
          <span>OpenAI API Key</span>
          <div className="settings-api-key-row">
            <input
              id="settings-openai-api-key"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onPaste={handlePaste}
              placeholder="sk-..."
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn-secondary settings-paste-btn"
              onClick={() => {
                const t = window.api?.getClipboardText?.() ?? ''
                setApiKey(t.trim())
              }}
            >
              Paste
            </button>
          </div>
        </label>
        <p className="settings-key-debug">Key length: {apiKey.length}</p>
        <button type="button" className="btn-primary" onClick={handleSave}>
          Save
        </button>
        {saved && <span className="saved-msg">Saved.</span>}
      </main>
    </div>
  )
}
