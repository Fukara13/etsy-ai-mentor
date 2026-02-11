import { contextBridge, ipcRenderer, clipboard } from 'electron'

const captureAnalyze = (captureId: string) => ipcRenderer.invoke('capture:analyze', captureId)

contextBridge.exposeInMainWorld('api', {
  captureAnalyze,
  getClipboardText: () => clipboard.readText(),
})

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, payload?: unknown) => ipcRenderer.invoke(channel, payload),
})

contextBridge.exposeInMainWorld('electronAPI', {
  sendAppView: (view: string) => {
    console.log('[nav] preload sendAppView →', view)
    ipcRenderer.send('app:view', view)
  },
  browserSetBounds: (rect: { x: number; y: number; width: number; height: number }) => ipcRenderer.send('browser:setBounds', rect),
  navGo: (url: string) => ipcRenderer.invoke('nav:go', url),
  getCurrentUrl: () => ipcRenderer.invoke('getCurrentUrl'),
  onUrlChanged: (cb: (url: string) => void) => {
    const handler = (_: unknown, url: string) => cb(url)
    ipcRenderer.on('browser:urlChanged', handler)
    return () => ipcRenderer.removeListener('browser:urlChanged', handler)
  },
  createSession: (id: string, note?: string) => ipcRenderer.invoke('session:create', id, note),
  captureCreate: (payload: { sessionId: string }) => ipcRenderer.invoke('capture:create', payload),
  onCaptureCreated: (cb: (data: { captureId: string; sessionId: string; url: string }) => void) => {
    const handler = (_: unknown, data: { captureId: string; sessionId: string; url: string }) => cb(data)
    ipcRenderer.on('capture:created', handler)
    return () => ipcRenderer.removeListener('capture:created', handler)
  },
  onCaptureFailed: (cb: (errorMessage: string) => void) => {
    const handler = (_: unknown, data: { errorMessage: string }) => cb(data.errorMessage)
    ipcRenderer.on('capture:failed', handler)
    return () => ipcRenderer.removeListener('capture:failed', handler)
  },
  analyzeCapture: captureAnalyze,
  listSessions: () => ipcRenderer.invoke('listSessions'),
  listStores: () => ipcRenderer.invoke('listStores'),
  updateStoreGoal: (id: number, goal: string | null) => ipcRenderer.invoke('updateStoreGoal', id, goal),
  getSession: (id: string) => ipcRenderer.invoke('getSession', id),
  getSetting: (key: string) => ipcRenderer.invoke('getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('setSetting', key, value),
  getCapture: (id: string) => ipcRenderer.invoke('getCapture', id),
  getAiOutput: (captureId: string, type: string) => ipcRenderer.invoke('getAiOutput', captureId, type),
  listCaptures: (sessionId: string) => ipcRenderer.invoke('listCaptures', sessionId),
  getCaptureImage: (captureId: string) => ipcRenderer.invoke('getCaptureImage', captureId),
  getParsedListing: (captureId: string) => ipcRenderer.invoke('getParsedListing', captureId),
  updateSessionNote: (sessionId: string, note: string) => ipcRenderer.invoke('updateSessionNote', sessionId, note),
  setCompetitor: (payload: { sessionId: string; url: string }) => ipcRenderer.invoke('competitor:set', payload),
  clearCompetitor: (sessionId: string) => ipcRenderer.invoke('competitor:clear', sessionId),
  getCompetitorUrl: (sessionId: string) => ipcRenderer.invoke('getCompetitorUrl', sessionId),
  competitorCapture: (payload: { sessionId: string; url: string }) => ipcRenderer.invoke('competitor:capture', payload),
  getLatestCompetitorSignals: (sessionId: string) => ipcRenderer.invoke('getLatestCompetitorSignals', sessionId),
  // Gate 7: neutral listing capture (no interpretation)
  gate7CaptureListing: (storeId: number) => ipcRenderer.invoke('gate7:captureListing', { storeId }),
  gate7SetContext: (payload: { storeId: number }) => ipcRenderer.invoke('gate7:setContext', payload),
  onGate7ListingCaptured: (cb: (snapshot: { id: string; listing_url: string; title_text: string | null; description_text: string | null; tags: string[]; image_count: number | null; created_at: number }) => void) => {
    const handler = (_: unknown, snapshot: Parameters<typeof cb>[0]) => cb(snapshot)
    ipcRenderer.on('gate7:listingCaptured', handler)
    return () => ipcRenderer.removeListener('gate7:listingCaptured', handler)
  },
  gate7CloseBrowser: () => ipcRenderer.send('gate7:closeBrowser'),
})
