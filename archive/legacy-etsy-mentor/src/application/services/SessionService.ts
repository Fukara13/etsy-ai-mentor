import type { Session } from '../../types'
import type { GateService } from './GateService'

type SessionServiceDeps = {
  gateService: GateService
  db: {
    getSession: (id: string) => Session | null
    insertSession: (id: string, note?: string) => void
    listSessions: () => Session[]
    updateSessionNote: (id: string, note: string) => void
    setSessionCompetitorUrl?: (sessionId: string, url: string | null) => void
  }
}

export class SessionService {
  constructor(private readonly deps: SessionServiceDeps) {}

  async createSession(input: { id: string; note?: string }): Promise<Session | null> {
    // Gate 10 enforcement mirrors existing behavior (OPEN or PASS required)
    await this.deps.gateService.requireGate('gate10')

    const existing = this.deps.db.getSession(input.id)
    if (!existing) {
      this.deps.db.insertSession(input.id, input.note)
    }
    if (this.deps.db.setSessionCompetitorUrl) {
      // Keep previous side-effect used by competitor flows
      this.deps.db.setSessionCompetitorUrl(input.id, null)
    }
    return this.deps.db.getSession(input.id)
  }

  async listSessions(): Promise<Session[]> {
    // TODO: Add pagination / filtering when needed
    return this.deps.db.listSessions()
  }

  async getSession(id: string): Promise<Session | null> {
    return this.deps.db.getSession(id)
  }

  async updateSessionNote(id: string, note: string): Promise<void> {
    // Keep current behavior of creating the session if it does not exist
    const existing = this.deps.db.getSession(id)
    if (!existing) {
      this.deps.db.insertSession(id)
    }
    this.deps.db.updateSessionNote(id, note)
  }
}

