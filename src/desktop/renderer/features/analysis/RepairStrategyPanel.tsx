/**
 * DC-7: Repair Strategy Panel — read-only reasoning surface.
 * No execution authority; presentational only.
 */

import { useState, useEffect } from 'react'
import { Card, SectionHeader, EmptyState } from '../../ui'
import { mapRepairStrategyViewModel } from '../../../analysis/analysis-view.mapper'
import type { RepairStrategyViewModel } from '../../../analysis/analysis.view-model'

type LoadState = 'loading' | 'loaded' | 'error'

function RepairStrategyPanelContent({ viewModel }: { viewModel: RepairStrategyViewModel }) {
  if (viewModel.status === 'empty') {
    return <EmptyState message="No repair strategy available." />
  }
  return (
    <div className="analysis-panel">
      {viewModel.proposedSteps.length > 0 && (
        <div className="analysis-panel__section">
          <span className="analysis-panel__label">Proposed steps</span>
          <ol className="analysis-panel__list analysis-panel__list--ordered">
            {viewModel.proposedSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      <div className="analysis-panel__row">
        <span className="analysis-panel__label">Expected result</span>
        <span className="analysis-panel__value">{viewModel.expectedResult}</span>
      </div>
      {viewModel.riskLevel && (
        <div className="analysis-panel__row">
          <span className="analysis-panel__label">Risk level</span>
          <span className="analysis-panel__value">{viewModel.riskLevel}</span>
        </div>
      )}
      {viewModel.notes && (
        <div className="analysis-panel__row">
          <span className="analysis-panel__label">Notes</span>
          <span className="analysis-panel__value">{viewModel.notes}</span>
        </div>
      )}
    </div>
  )
}

export function RepairStrategyPanel() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [viewModel, setViewModel] = useState<RepairStrategyViewModel | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    api
      .getRepairStrategyView()
      .then((data) => {
        setViewModel(mapRepairStrategyViewModel(data ?? null))
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <Card>
        <SectionHeader title="Repair Strategy" />
        <p className="analysis-panel__loading">Loading strategy…</p>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card>
        <SectionHeader title="Repair Strategy" />
        <EmptyState message="Unable to load repair strategy." />
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeader title="Repair Strategy" />
      {viewModel ? (
        <RepairStrategyPanelContent viewModel={viewModel} />
      ) : (
        <EmptyState message="No repair strategy available." />
      )}
    </Card>
  )
}
