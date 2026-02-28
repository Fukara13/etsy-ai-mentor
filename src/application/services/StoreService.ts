import type { Store } from '../../types'

type StoreServiceDeps = {
  db: {
    listStores: () => Store[]
    updateStoreGoal: (id: number, goal: string | null) => void
  }
}

export class StoreService {
  constructor(private readonly deps: StoreServiceDeps) {}

  async listStores(): Promise<Store[]> {
    return this.deps.db.listStores()
  }

  async updateStoreGoal(storeId: number, goal: string | null): Promise<void> {
    this.deps.db.updateStoreGoal(storeId, goal)
  }
}

