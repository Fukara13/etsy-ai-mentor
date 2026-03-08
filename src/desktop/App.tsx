/**
 * DC-5/DC-6: Desktop Control Center — App shell + State Machine Viewer + Repair Run Timeline.
 * Read-only; no mutation actions.
 */

import { useState } from 'react'
import { AppShell } from './renderer/ui'
import { StateMachineViewer } from './renderer/features/state-machine/StateMachineViewer'
import { RepairRunTimeline } from './renderer/features/repair-timeline/repair-run-timeline'
import './styles.css'
import './renderer/shell.css'
import './renderer/features/state-machine/state-machine-viewer.css'
import './renderer/features/repair-timeline/repair-run-timeline.css'

export function App() {
  const sidebarContent = (
    <nav>
      <a href="#" className="dc-sidebar__link dc-sidebar__link--active">
        Dashboard
      </a>
    </nav>
  )

  const mainContent = (
    <div className="dc-dashboard">
      <StateMachineViewer />
      <RepairRunTimeline />
    </div>
  )

  return (
    <AppShell
      sidebarContent={sidebarContent}
      topbarTitle="Etsy AI Mentor — Desktop Control Center"
      mainContent={mainContent}
    />
  )
}
