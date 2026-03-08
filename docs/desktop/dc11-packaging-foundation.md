# DC-11 — Release Packaging Foundation

**Project:** Etsy AI Mentor  
**Scope:** Packaging foundation for Electron Desktop Control Center  
**Status:** Implemented  

---

## 1. Packaging Tool

**Chosen:** [electron-builder](https://www.electron.build/)  
**Version:** ^25.1.8  

**Why:**
- Widely used, stable, and well-supported
- Minimal config for our structure (no extra build steps)
- Supports unpacked (`--dir`) and packaged output
- Integrates with existing Vite + tsc build
- No custom scripts or orchestration required

---

## 2. Output Structure

| Artifact | Location |
|----------|----------|
| Renderer build | `dist/` |
| Electron main/preload | `dist-electron/` |
| Packaged (unpacked) | `release/win-unpacked/` |
| Packaged (installer) | `release/` |

The app.asar inside `release/<platform>-unpacked/resources/` contains:  
`dist/`, `dist-electron/`, `node_modules` (production deps), `package.json`.

---

## 3. Commands

| Script | Purpose |
|--------|---------|
| `npm run desktop:build` | Vite renderer build + tsc Electron build |
| `npm run desktop:package` | Build + full packaged installer |
| `npm run desktop:package:dir` | Build + unpacked app (for local testing) |

Run the unpacked app:
```bash
release\win-unpacked\Etsy AI Mentor.exe
```

---

## 4. Path Resolution (Packaged Mode)

- **Main entry:** `dist-electron/electron/desktop/main.js` (via `extraMetadata.main`)
- **Renderer:** `path.join(__dirname, '..', '..', '..', 'dist', 'index-desktop.html')`
- **Preload:** `path.join(__dirname, 'preload', 'preload.js')`

`__dirname` in packaged mode is inside app.asar; paths resolve to `app.asar/dist/` and `app.asar/dist-electron/electron/desktop/preload/`.

---

## 5. Security (Preserved)

- `nodeIntegration: false`
- `contextIsolation: true`
- `sandbox: true`
- Preload allow-list and read-only IPC unchanged
- DevTools: disabled when packaged (`!app.isPackaged`)

---

## 6. Explicitly Deferred to DC-12

- Code signing
- Auto-update / updater
- Release publishing
- Installer customization
- Cross-platform packaging (macOS, Linux)

---

## 7. Config Notes

- **`win.signAndEditExecutable: false`** — Disables the post-packaging executable edit step that requires winCodeSign. Without this, unpacking winCodeSign on Windows can fail if symlink creation is restricted. Code signing will be configured in DC-12.
- **`tsconfig.electron.json`** — Excludes `**/*.test.ts` and `**/*.test.tsx` so electron build does not compile vitest-dependent test files.
