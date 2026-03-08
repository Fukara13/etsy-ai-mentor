/**
 * DC-5: App shell layout — sidebar, topbar, main content.
 */

import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

type Props = {
  sidebarContent: ReactNode
  topbarTitle: string
  mainContent: ReactNode
}

export function AppShell({ sidebarContent, topbarTitle, mainContent }: Props) {
  return (
    <div className="dc-app-shell">
      <Sidebar>{sidebarContent}</Sidebar>
      <div className="dc-app-shell__main">
        <Topbar title={topbarTitle} />
        <main className="dc-app-shell__content">{mainContent}</main>
      </div>
    </div>
  )
}
