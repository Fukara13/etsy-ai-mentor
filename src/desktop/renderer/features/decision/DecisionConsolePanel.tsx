/**
 * DC-9: Human Decision Console — read-only.
 * Buttons update local UI state only. No mutation, no execution.
 */

import { useState, useEffect } from 'react'
import { Card, SectionHeader } from '../../ui'
import { mapDecisionViewModel } from '../../../decision/decision-view.mapper'
import type { DecisionViewModel, DecisionOptionViewModel, RiskLevelViewModel } from '../../../decision/decision.view-model'

type LoadState = 'loading' | 'loaded' | 'error'

function RiskBadge({ level }: { level: RiskLevelViewModel }) {
  const className = `decision-console__risk-badge decision-console__risk-badge--${level.toLowerCase()}`
  return <span className={className} role="status">{level}</span>
}

function DecisionOptionButton({
  option,
  isSelected,
  onSelect,
}: {
  option: DecisionOptionViewModel
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`decision-console__option decision-console__option--${option.id} ${isSelected ? 'decision-console__option--selected' : ''}`}
      onClick={onSelect}
      aria-pressed={isSelected}
      aria-label={`${option.label}. ${option.description}`}
    >
      <span className="decision-console__option-label">{option.label}</span>
      <span className="decision-console__option-desc">{option.description}</span>
    </button>
  )
}

export function DecisionConsolePanel() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [viewModel, setViewModel] = useState<DecisionViewModel | null>(null)
  const [selectedId, setSelectedId] = useState<'approve' | 'reject' | 'escalate' | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    api
      .getDecisionView()
      .then((data) => {
        setViewModel(mapDecisionViewModel(data ?? null))
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <Card>
        <SectionHeader title="Human Decision Console" />
        <p className="decision-console__loading">Loading decision context…</p>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card>
        <SectionHeader title="Human Decision Console" />
        <p className="decision-console__empty">Unable to load decision context.</p>
      </Card>
    )
  }

  const vm = viewModel ?? mapDecisionViewModel(null)

  return (
    <Card>
      <SectionHeader title={vm.heading} />
      <section className="decision-console" aria-labelledby="decision-heading">
        <h2 id="decision-heading" className="decision-console__subtitle">
          Decision context
        </h2>

        <div className="decision-console__section">
          <h3 className="decision-console__section-title">{vm.gptAnalysis.title}</h3>
          <p className="decision-console__section-body">{vm.gptAnalysis.body}</p>
        </div>

        <div className="decision-console__section">
          <h3 className="decision-console__section-title">{vm.repairStrategy.title}</h3>
          <p className="decision-console__section-body">{vm.repairStrategy.body}</p>
        </div>

        <div className="decision-console__risk-row">
          <span className="decision-console__risk-label">Risk level</span>
          <RiskBadge level={vm.riskLevel} />
        </div>

        <p className="decision-console__prompt">{vm.operatorPrompt}</p>

        <div className="decision-console__options" role="group" aria-label="Decision options">
          {vm.options.map((opt) => (
            <DecisionOptionButton
              key={opt.id}
              option={opt}
              isSelected={selectedId === opt.id}
              onSelect={() => setSelectedId(opt.id)}
            />
          ))}
        </div>

        {selectedId && (
          <p className="decision-console__helper" role="status">
            Decision recorded locally for review only.
          </p>
        )}
      </section>
    </Card>
  )
}
