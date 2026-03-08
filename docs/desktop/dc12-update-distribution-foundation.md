# DC-12 — Update & Distribution Foundation

**Project:** Etsy AI Mentor  
**Scope:** Update and distribution foundation for Desktop Control Center  
**Status:** Implemented  

---

## 1. Update Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Main Process                                                    │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │ Version Handler  │    │ Update Service (packaged only)    │  │
│  │ app.getVersion() │    │ - checkForUpdates()               │  │
│  └────────┬─────────┘    │ - notify renderer: available      │  │
│           │              │ - notify renderer: downloaded     │  │
│           │              │ - installUpdate() → quitAndInstall│  │
│           │              └──────────────────────────────────┘  │
│           │                             │                       │
└───────────┼─────────────────────────────┼───────────────────────┘
            │ IPC                         │ IPC (events)
            ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Renderer (untrusted)                                             │
│  - AppFooter: version, "Restart to install" when update ready   │
│  - Human must confirm installation; no auto-install             │
└─────────────────────────────────────────────────────────────────┘
```

- **Version:** Read from `package.json` via `app.getVersion()`; exposed to renderer via IPC.
- **electron-updater:** Integrated; update service runs only when packaged (`app.isPackaged`).
- **Human confirmation:** `autoInstallOnAppQuit: false`; install only via explicit "Restart to install" in UI.

---

## 2. Release Model

| Channel   | Env Var        | Use Case              |
|-----------|----------------|------------------------|
| `stable`  | (default)      | Production releases    |
| `beta`    | `UPDATE_CHANNEL=beta` | Beta testers    |
| `dev`     | `UPDATE_CHANNEL=dev`  | Development builds  |

- Only infrastructure; no channel selector in UI yet.
- Publish URL: configure `build.publish.url` in package.json (placeholder `https://example.com/releases`).
- For real releases, override via environment or build config.

---

## 3. Packaging & Artifacts

electron-builder with `publish` and `nsis` produces:

| Artifact                 | Location                      |
|--------------------------|-------------------------------|
| Installer                | `release/Etsy AI Mentor Setup x.x.x.exe` |
| Blockmap                 | `release/Etsy AI Mentor Setup x.x.x.exe.blockmap` |
| Update metadata          | `release/latest.yml`          |

- `desktop:package` uses `--publish never` to build without uploading.
- Upload and release publishing are deferred (no CI triggers, no automation in DC-12).

---

## 4. Commands

| Script               | Purpose                                   |
|----------------------|-------------------------------------------|
| `npm run desktop:build` | Build renderer + electron              |
| `npm run desktop:package` | Build + installer (no publish)       |
| `npm run desktop:package:dir` | Build + unpacked app (local test) |

---

## 5. Deferred Features

- Publish URL configuration and release hosting
- Channel selection UI
- Code signing (still `signAndEditExecutable: false` on Windows)
- CI/CD release pipeline
- macOS / Linux packaging
