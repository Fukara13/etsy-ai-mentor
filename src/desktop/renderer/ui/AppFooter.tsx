/**
 * DC-12: App footer — version and update status.
 * Version from package.json; update notifications (no auto-install; human confirms).
 */

import { useEffect, useState } from 'react'

export function AppFooter() {
  const [version, setVersion] = useState<string>('—')
  const [updateDownloaded, setUpdateDownloaded] = useState(false)

  useEffect(() => {
    const api = window.desktopApi
    if (!api) return
    api.system.getVersion().then(setVersion)
    const unsubAvailable = api.updates.onUpdateAvailable(() => {
      setUpdateDownloaded(false)
    })
    const unsubDownloaded = api.updates.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
    })
    return () => {
      unsubAvailable()
      unsubDownloaded()
    }
  }, [])

  const handleRestart = () => {
    window.desktopApi?.updates.installUpdate()
  }

  return (
    <div className="dc-app-footer">
      <span className="dc-app-footer__version">v{version}</span>
      {updateDownloaded && (
        <button
          type="button"
          className="dc-app-footer__restart"
          onClick={handleRestart}
        >
          Restart to install update
        </button>
      )}
    </div>
  )
}
