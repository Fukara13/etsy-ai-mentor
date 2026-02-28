import { contextBridge, ipcRenderer } from 'electron'

console.log('[preload] loaded')
console.log('[preload] contextIsolated=', process.contextIsolated)

const api = {
  ping: () => 'pong',
  guardianGetInitialGreeting: () => ipcRenderer.invoke('guardian:getInitialGreeting', 1),
  /** Canonical chat/orchestration entrypoint: mentor:executeCommand in main */
  mentorExecuteCommand: (payload: unknown) => ipcRenderer.invoke('mentor:executeCommand', payload),
  navGo: (target: string) => ipcRenderer.invoke('nav:go', target),
  sendAppView: (view: string) => ipcRenderer.send('app:view', view),
}
console.log('[preload] exposing api keys=', Object.keys(api))
contextBridge.exposeInMainWorld('electronAPI', api)
