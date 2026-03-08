/**
 * DC-7: GPT Analysis Panel tests.
 * Read-only; no execution controls.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GPTAnalysisPanel } from './GPTAnalysisPanel'

describe('GPTAnalysisPanel', () => {
  const mockGetGPTAnalysisView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as any).desktopApi = {
      read: { getGPTAnalysisView: mockGetGPTAnalysisView },
    }
  })

  afterEach(() => {
    delete (window as any).desktopApi
  })

  it('renders main fields for ready state', async () => {
    mockGetGPTAnalysisView.mockResolvedValue({
      id: 'g1',
      traceId: 't1',
      failureType: 'TypeScript compile error',
      rootCause: 'Missing type import',
      suggestedFix: 'Add import',
      risk: 'low',
      confidence: 0.9,
      findings: [{ id: 'f1', title: 'T', severity: 'low', summary: 's', evidence: 'src/order.ts' }],
      analyzedAt: 1709900015,
    })

    render(<GPTAnalysisPanel />)

    await waitFor(() => {
      expect(screen.getByText('TypeScript compile error')).toBeDefined()
      expect(screen.getByText('Missing type import')).toBeDefined()
      expect(screen.getByText('High')).toBeDefined()
      expect(screen.getByText('src/order.ts')).toBeDefined()
    })
  })

  it('renders empty-state text when data is null', async () => {
    mockGetGPTAnalysisView.mockResolvedValue(null)

    render(<GPTAnalysisPanel />)

    await waitFor(() => {
      expect(screen.getByText('No GPT analysis available.')).toBeDefined()
    })
  })

  it('does not render any execution controls or buttons', async () => {
    mockGetGPTAnalysisView.mockResolvedValue({
      id: 'g1',
      traceId: 't1',
      failureType: 'F',
      rootCause: 'R',
      suggestedFix: '',
      risk: 'low',
      confidence: 0.8,
      findings: [],
      analyzedAt: 0,
    })

    const { container, findByText } = render(<GPTAnalysisPanel />)

    await findByText('F')

    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(0)
  })

  it('shows loading state initially', () => {
    mockGetGPTAnalysisView.mockImplementation(() => new Promise(() => {}))

    render(<GPTAnalysisPanel />)

    expect(screen.getByText('Loading analysis…')).toBeDefined()
  })

  it('shows error state when API fails', async () => {
    mockGetGPTAnalysisView.mockRejectedValue(new Error('Network error'))

    render(<GPTAnalysisPanel />)

    await waitFor(() => {
      expect(screen.getByText('Unable to load GPT analysis.')).toBeDefined()
    })
  })
})
