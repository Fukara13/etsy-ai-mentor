/**
 * DC-9: Decision Console Panel tests.
 * UI-only; buttons update local state. No mutation API calls.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { DecisionConsolePanel } from './DecisionConsolePanel'

describe('DecisionConsolePanel', () => {
  const mockGetDecisionView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as any).desktopApi = {
      read: { getDecisionView: mockGetDecisionView },
    }
  })

  afterEach(() => {
    delete (window as any).desktopApi
  })

  it('renders heading', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      gptAnalysisTitle: 'Root Cause',
      gptAnalysisBody: 'Test body',
      repairStrategyTitle: 'Strategy',
      repairStrategyBody: 'Strategy body',
      riskLevel: 'MEDIUM',
      operatorPrompt: 'Choose an action.',
    })

    const { container, findByRole } = render(<DecisionConsolePanel />)
    const heading = await within(container).findByRole('heading', { name: /Human Decision Console/i })
    expect(heading).toBeDefined()
  })

  it('renders GPT analysis content', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      gptAnalysisTitle: 'Root Cause',
      gptAnalysisBody: 'The failure appears related to a missing dependency.',
      repairStrategyTitle: 'Strategy',
      repairStrategyBody: 'Body',
      riskLevel: 'LOW',
      operatorPrompt: 'Choose.',
    })

    const { container, findByText } = render(<DecisionConsolePanel />)
    const scope = within(container)
    expect(await scope.findByText('Root Cause')).toBeDefined()
    expect(await scope.findByText('The failure appears related to a missing dependency.')).toBeDefined()
  })

  it('renders repair strategy content', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      gptAnalysisTitle: 'Root',
      gptAnalysisBody: 'Body',
      repairStrategyTitle: 'Recommended Strategy',
      repairStrategyBody: 'Update the dependency and rerun.',
      riskLevel: 'MEDIUM',
      operatorPrompt: 'Review.',
    })

    const { container, findByText } = render(<DecisionConsolePanel />)
    const scope = within(container)
    expect(await scope.findByText('Recommended Strategy')).toBeDefined()
    expect(await scope.findByText('Update the dependency and rerun.')).toBeDefined()
  })

  it('renders risk level', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      riskLevel: 'HIGH',
      operatorPrompt: 'Choose.',
    })

    const { container, findByText } = render(<DecisionConsolePanel />)
    expect(await within(container).findByText('HIGH')).toBeDefined()
  })

  it('renders operator prompt', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      operatorPrompt: 'Review the AI recommendation before deciding.',
    })

    const { container, findByText } = render(<DecisionConsolePanel />)
    expect(await within(container).findByText('Review the AI recommendation before deciding.')).toBeDefined()
  })

  it('renders all three buttons', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      operatorPrompt: 'Choose.',
    })

    const { container, findByRole } = render(<DecisionConsolePanel />)
    const scope = within(container)
    expect(await scope.findByRole('button', { name: /Approve Strategy/i })).toBeDefined()
    expect(await scope.findByRole('button', { name: /Reject Strategy/i })).toBeDefined()
    expect(await scope.findByRole('button', { name: /Escalate to Manual/i })).toBeDefined()
  })

  it('clicking a button updates local selected state', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      operatorPrompt: 'Choose.',
    })

    const { container, findByRole } = render(<DecisionConsolePanel />)
    const approveBtn = await within(container).findByRole('button', { name: /Approve Strategy/i })
    fireEvent.click(approveBtn)
    expect(approveBtn.getAttribute('aria-pressed')).toBe('true')
  })

  it('does not invoke any write-like API on button click', async () => {
    mockGetDecisionView.mockResolvedValue({
      id: 'd1',
      traceId: 't1',
      operatorPrompt: 'Choose.',
    })

    const { container, findByRole } = render(<DecisionConsolePanel />)
    const approveBtn = await within(container).findByRole('button', { name: /Approve Strategy/i })
    fireEvent.click(approveBtn)
    expect(mockGetDecisionView).toHaveBeenCalledTimes(1)
    const api = (window as any).desktopApi
    expect(api?.write).toBeUndefined()
    expect(api?.mutate).toBeUndefined()
    expect(api?.execute).toBeUndefined()
  })
})
