/**
 * DC-7: Repair Strategy Panel tests.
 * Read-only; no execution controls.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { RepairStrategyPanel } from './RepairStrategyPanel'

describe('RepairStrategyPanel', () => {
  const mockGetRepairStrategyView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as any).desktopApi = {
      read: { getRepairStrategyView: mockGetRepairStrategyView },
    }
  })

  afterEach(() => {
    delete (window as any).desktopApi
  })

  it('renders main fields for ready state', async () => {
    mockGetRepairStrategyView.mockResolvedValue({
      id: 's1',
      traceId: 't1',
      handoffIntent: 'review',
      nextAction: 'TypeScript compilation succeeds',
      operatorMessage: 'No runtime behavior change expected',
      steps: [
        { id: '1', label: 'Add the missing type import', status: 'pending', summary: 'Add the missing type import' },
        { id: '2', label: 'Re-run type check', status: 'pending', summary: 'Re-run type check' },
      ],
      status: 'running',
      updatedAt: 1709900060,
    })

    render(<RepairStrategyPanel />)

    await waitFor(() => {
      expect(screen.getByText('Add the missing type import')).toBeDefined()
      expect(screen.getByText('Re-run type check')).toBeDefined()
      expect(screen.getByText('TypeScript compilation succeeds')).toBeDefined()
      expect(screen.getByText('No runtime behavior change expected')).toBeDefined()
    })
  })

  it('renders empty-state text when data is null', async () => {
    mockGetRepairStrategyView.mockResolvedValue(null)

    render(<RepairStrategyPanel />)

    await waitFor(() => {
      expect(screen.getByText('No repair strategy available.')).toBeDefined()
    })
  })

  it('does not render any execution controls or buttons', async () => {
    mockGetRepairStrategyView.mockResolvedValue({
      id: 's1',
      traceId: 't1',
      handoffIntent: '',
      nextAction: 'Done',
      operatorMessage: '',
      steps: [{ id: '1', label: 'Step 1', status: 'pending', summary: 'Step 1' }],
      status: 'running',
      updatedAt: 0,
    })

    const { container, findByText } = render(<RepairStrategyPanel />)

    await findByText('Step 1')

    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(0)
  })

  it('shows loading state initially', () => {
    mockGetRepairStrategyView.mockImplementation(() => new Promise(() => {}))

    render(<RepairStrategyPanel />)

    expect(screen.getByText('Loading strategy…')).toBeDefined()
  })

  it('shows error state when API fails', async () => {
    mockGetRepairStrategyView.mockRejectedValue(new Error('Network error'))

    render(<RepairStrategyPanel />)

    await waitFor(() => {
      expect(screen.getByText('Unable to load repair strategy.')).toBeDefined()
    })
  })
})
