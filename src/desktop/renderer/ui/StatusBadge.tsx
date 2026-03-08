/**
 * DC-5: Status badge for state/status display.
 */

type Props = {
  label: string
  variant?: 'neutral' | 'success' | 'warning' | 'error'
}

export function StatusBadge({ label, variant = 'neutral' }: Props) {
  return <span className={`dc-status-badge dc-status-badge--${variant}`}>{label}</span>
}
