/**
 * DC-7: GPT Analysis Panel — read-only reasoning surface.
 * No execution authority; presentational only.
 */

import { useState, useEffect } from 'react'
import { Card, SectionHeader, EmptyState } from '../../ui'
import { mapGPTAnalysisViewModel } from '../../../analysis/analysis-view.mapper'
import type { GPTAnalysisViewModel } from '../../../analysis/analysis.view-model'

type LoadState = 'loading' | 'loaded' | 'error'

function GPTAnalysisPanelContent({ viewModel }: { viewModel: GPTAnalysisViewModel }) {
  if (viewModel.status === 'empty') {
    return <EmptyState message="No GPT analysis available." />
  }
  return (
    <div className="analysis-panel">
      <div className="analysis-panel__row">
        <span className="analysis-panel__label">Failure type</span>
        <span className="analysis-panel__value">{viewModel.failureType}</span>
      </div>
      <div className="analysis-panel__row">
        <span className="analysis-panel__label">Root cause</span>
        <span className="analysis-panel__value">{viewModel.rootCause}</span>
      </div>
      <div className="analysis-panel__row">
        <span className="analysis-panel__label">Confidence</span>
        <span className="analysis-panel__value">{viewModel.confidence}</span>
      </div>
      {viewModel.affectedFiles.length > 0 && (
        <div className="analysis-panel__section">
          <span className="analysis-panel__label">Affected files</span>
          <ul className="analysis-panel__list">
            {viewModel.affectedFiles.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {viewModel.summary && (
        <div className="analysis-panel__row">
          <span className="analysis-panel__label">Summary</span>
          <span className="analysis-panel__value">{viewModel.summary}</span>
        </div>
      )}
    </div>
  )
}

export function GPTAnalysisPanel() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [viewModel, setViewModel] = useState<GPTAnalysisViewModel | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    api
      .getGPTAnalysisView()
      .then((data) => {
        setViewModel(mapGPTAnalysisViewModel(data ?? null))
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <Card>
        <SectionHeader title="GPT Analysis" />
        <p className="analysis-panel__loading">Loading analysis…</p>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card>
        <SectionHeader title="GPT Analysis" />
        <EmptyState message="Unable to load GPT analysis." />
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeader title="GPT Analysis" />
      {viewModel ? <GPTAnalysisPanelContent viewModel={viewModel} /> : <EmptyState message="No GPT analysis available." />}
    </Card>
  )
}
