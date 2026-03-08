/**
 * DC-5/DC-6/DC-7/DC-8: Desktop Control Center — App shell + State Machine Viewer + Repair Run Timeline + Analysis Surfaces + Telemetry Dashboard.
 * Read-only; no mutation actions.
 */

import { AppShell } from './renderer/ui'
import { StateMachineViewer } from './renderer/features/state-machine/StateMachineViewer'
import { RepairRunTimeline } from './renderer/features/repair-timeline/repair-run-timeline'
import { GPTAnalysisPanel } from './renderer/features/analysis/GPTAnalysisPanel'
import { RepairStrategyPanel } from './renderer/features/analysis/RepairStrategyPanel'
import { TelemetryDashboard } from './renderer/features/telemetry/TelemetryDashboard'
import './styles.css'
import './renderer/shell.css'
import './renderer/features/state-machine/state-machine-viewer.css'
import './renderer/features/repair-timeline/repair-run-timeline.css'
import './renderer/features/analysis/analysis-panel.css'
import './renderer/features/telemetry/telemetry-dashboard.css'

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
      <GPTAnalysisPanel />
      <RepairStrategyPanel />
      <TelemetryDashboard />
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
