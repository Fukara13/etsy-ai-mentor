/**
 * DC-5: Empty state placeholder.
 */

type Props = {
  message: string
}

export function EmptyState({ message }: Props) {
  return (
    <div className="dc-empty-state">
      <p className="dc-empty-state__message">{message}</p>
    </div>
  )
}
