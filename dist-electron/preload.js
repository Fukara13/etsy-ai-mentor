"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const captureAnalyze = (captureId) => electron_1.ipcRenderer.invoke('capture:analyze', captureId);
electron_1.contextBridge.exposeInMainWorld('api', {
    captureAnalyze,
    getClipboardText: () => electron_1.clipboard.readText(),
});
electron_1.contextBridge.exposeInMainWorld('ipc', {
    invoke: (channel, payload) => electron_1.ipcRenderer.invoke(channel, payload),
});
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    sendAppView: (view) => {
        console.log('[nav] preload sendAppView →', view);
        electron_1.ipcRenderer.send('app:view', view);
    },
    browserSetBounds: (rect) => electron_1.ipcRenderer.send('browser:setBounds', rect),
    navGo: (url) => electron_1.ipcRenderer.invoke('nav:go', url),
    getCurrentUrl: () => electron_1.ipcRenderer.invoke('getCurrentUrl'),
    onUrlChanged: (cb) => {
        const handler = (_, url) => cb(url);
        electron_1.ipcRenderer.on('browser:urlChanged', handler);
        return () => electron_1.ipcRenderer.removeListener('browser:urlChanged', handler);
    },
    createSession: (id, note) => electron_1.ipcRenderer.invoke('session:create', id, note),
    captureCreate: (payload) => electron_1.ipcRenderer.invoke('capture:create', payload),
    onCaptureCreated: (cb) => {
        const handler = (_, data) => cb(data);
        electron_1.ipcRenderer.on('capture:created', handler);
        return () => electron_1.ipcRenderer.removeListener('capture:created', handler);
    },
    onCaptureFailed: (cb) => {
        const handler = (_, data) => cb(data.errorMessage);
        electron_1.ipcRenderer.on('capture:failed', handler);
        return () => electron_1.ipcRenderer.removeListener('capture:failed', handler);
    },
    analyzeCapture: captureAnalyze,
    listSessions: () => electron_1.ipcRenderer.invoke('listSessions'),
    listStores: () => electron_1.ipcRenderer.invoke('listStores'),
    updateStoreGoal: (id, goal) => electron_1.ipcRenderer.invoke('updateStoreGoal', id, goal),
    getSession: (id) => electron_1.ipcRenderer.invoke('getSession', id),
    getSetting: (key) => electron_1.ipcRenderer.invoke('getSetting', key),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke('setSetting', key, value),
    getCapture: (id) => electron_1.ipcRenderer.invoke('getCapture', id),
    getAiOutput: (captureId, type) => electron_1.ipcRenderer.invoke('getAiOutput', captureId, type),
    listCaptures: (sessionId) => electron_1.ipcRenderer.invoke('listCaptures', sessionId),
    getCaptureImage: (captureId) => electron_1.ipcRenderer.invoke('getCaptureImage', captureId),
    getParsedListing: (captureId) => electron_1.ipcRenderer.invoke('getParsedListing', captureId),
    updateSessionNote: (sessionId, note) => electron_1.ipcRenderer.invoke('updateSessionNote', sessionId, note),
    setCompetitor: (payload) => electron_1.ipcRenderer.invoke('competitor:set', payload),
    clearCompetitor: (sessionId) => electron_1.ipcRenderer.invoke('competitor:clear', sessionId),
    getCompetitorUrl: (sessionId) => electron_1.ipcRenderer.invoke('getCompetitorUrl', sessionId),
    competitorCapture: (payload) => electron_1.ipcRenderer.invoke('competitor:capture', payload),
    getLatestCompetitorSignals: (sessionId) => electron_1.ipcRenderer.invoke('getLatestCompetitorSignals', sessionId),
    // Gate 7: neutral listing capture (no interpretation)
    gate7CaptureListing: (storeId) => electron_1.ipcRenderer.invoke('gate7:captureListing', { storeId }),
    gate7SetContext: (payload) => electron_1.ipcRenderer.invoke('gate7:setContext', payload),
    onGate7ListingCaptured: (cb) => {
        const handler = (_, snapshot) => cb(snapshot);
        electron_1.ipcRenderer.on('gate7:listingCaptured', handler);
        return () => electron_1.ipcRenderer.removeListener('gate7:listingCaptured', handler);
    },
    gate7CloseBrowser: () => electron_1.ipcRenderer.send('gate7:closeBrowser'),
});
