/**
 * DC-2: Minimal placeholder app for Desktop Control Center.
 * Displays shell status; calls preload ping; handles bridge failure.
 */

import './styles.css'

const APP_TITLE = 'Etsy AI Mentor — Desktop Control Center'
const PHASE_LABEL = 'Desktop Shell Bootstrap'

type BridgeStatus = 'connected' | 'failed' | 'checking'

function render(
  title: string,
  phase: string,
  bridgeStatus: BridgeStatus,
): void {
  const root = document.getElementById('root')
  if (!root) return

  const statusText =
    bridgeStatus === 'checking'
      ? 'checking...'
      : bridgeStatus === 'connected'
        ? 'connected'
        : 'failed'

  root.innerHTML = `
    <div class="desktop-shell">
      <h1 class="desktop-shell__title">${escapeHtml(title)}</h1>
      <p class="desktop-shell__phase">${escapeHtml(phase)}</p>
      <p class="desktop-shell__bridge desktop-shell__bridge--${bridgeStatus}">
        Bridge status: ${escapeHtml(statusText)}
      </p>
    </div>
  `
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

async function checkBridge(): Promise<BridgeStatus> {
  const api = window.desktopApi
  if (!api?.system?.ping) {
    return 'failed'
  }
  try {
    const res = await api.system.ping()
    return res?.ok === true && res?.source === 'main' ? 'connected' : 'failed'
  } catch {
    return 'failed'
  }
}

export function initApp(): void {
  render(APP_TITLE, PHASE_LABEL, 'checking')

  checkBridge().then((status) => {
    render(APP_TITLE, PHASE_LABEL, status)
  })
}
