# REPORT-08 — ELECTRON SECURITY BOUNDARY AUDIT

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Summary

Desktop Control Center uses hardened Electron security: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`, `allowRunningInsecureContent: false`, bounded preload, IPC allow-list, and navigation policy. No node exposure in renderer, unsafe preload API, or missing IPC allow-listing. Remaining risks: `package.json` main path may be incorrect; DevTools open in dev only.

---

## 2. Trust Boundary Map

| Boundary | Main | Preload | Renderer |
|----------|------|---------|----------|
| **Trust level** | Trusted (Node, fs, IPC) | Bounded (contextBridge only) | Untrusted |
| **Node.js** | Full | Preload script only | None |
| **API exposure** | N/A | `desktopApi` via contextBridge | Only `window.desktopApi` |
| **IPC** | ipcMain handlers | ipcRenderer.invoke (allow-listed) | Invokes via preload |

---

## 3. Security Hardening Evidence

| Control | Location | Evidence |
|---------|----------|----------|
| **nodeIntegration** | `electron/desktop/create-main-window.ts` line 26 | `nodeIntegration: false` |
| **contextIsolation** | `create-main-window.ts` line 27 | `contextIsolation: true` |
| **sandbox** | `create-main-window.ts` line 29 | `sandbox: true` |
| **webSecurity** | `create-main-window.ts` line 30 | `webSecurity: true` |
| **allowRunningInsecureContent** | `create-main-window.ts` line 31 | `allowRunningInsecureContent: false` |
| **Preload bounded** | `electron/desktop/preload/preload.ts` | Only `desktopApi` exposed; no raw ipcRenderer |
| **IPC allow-list** | `electron/desktop/allowed-ipc-channels.ts` | Single source of truth; 8 read channels |
| **Navigation policy** | `electron/desktop/create-main-window.ts`, `navigation-policy.ts` | `will-navigate` blocks non-allowed URLs; `setWindowOpenHandler` denies |
| **DevTools** | `create-main-window.ts` line 16–17 | `DEVTOOLS_OPEN = !app.isPackaged` — DevTools only when unpackaged |

---

## 4. Remaining Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **package.json main** | Medium | `main: "dist-electron/main.js"` may not exist; build outputs `dist-electron/electron/main.js` |
| **Full app preload** | Low | `electron/preload.ts` has write APIs; used only by full app, not desktop. Separation is correct. |
| **Backbone in main** | Low | `src/desktop/backbone` runs in main via IPC; no security risk, but path ownership is ambiguous |

---

## 5. Production Readiness Notes

- Desktop entry point (`electron/desktop/main.ts`) is hardened.
- For DC-11 packaging, ensure production build uses `app.isPackaged === true` so DevTools are disabled.
- Resolve `package.json` main path before packaging.
