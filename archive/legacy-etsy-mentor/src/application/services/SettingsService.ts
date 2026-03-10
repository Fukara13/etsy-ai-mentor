type SettingsServiceDeps = {
  db: {
    getSetting: (key: string) => string | undefined
    setSetting: (key: string, value: string) => void
  }
}

export class SettingsService {
  constructor(private readonly deps: SettingsServiceDeps) {}

  async getSetting(key: string): Promise<unknown> {
    // TODO: Consider JSON parsing / typed settings later
    return this.deps.db.getSetting(key)
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    // Persist as string for now to match existing DB behavior
    this.deps.db.setSetting(key, String(value))
  }
}

