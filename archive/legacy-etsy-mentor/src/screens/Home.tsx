import { useState, useEffect } from 'react'
import type { Session } from '../types'

type Props = {
  onNewSession: () => void
  onOpenSession: (id: string) => void
  onSettings: () => void
}

export default function Home({ onNewSession, onOpenSession, onSettings }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    window.electronAPI?.listSessions().then(setSessions).catch(() => setSessions([]))
  }, [])

  return (
    <div className="home">
      <header className="home-header">
        <h1>Etsy Mentor</h1>
        <button type="button" className="btn-secondary" onClick={onSettings}>
          Settings
        </button>
      </header>
      <main className="home-main">
        <button type="button" className="btn-primary" onClick={onNewSession}>
          New Session
        </button>
        <section className="recent-sessions">
          <h2>Recent Sessions</h2>
          <ul>
            {sessions.length === 0 && <li className="muted">No sessions yet.</li>}
            {sessions.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onOpenSession(s.id)}>
                  {s.note || s.id}
                </button>
                <span className="date">{new Date(s.created_at * 1000).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
