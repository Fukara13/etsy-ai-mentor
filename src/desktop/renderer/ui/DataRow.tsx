/**
 * DC-5: Key-value data row.
 */

type Props = {
  label: string
  value: string | number
}

export function DataRow({ label, value }: Props) {
  return (
    <div className="dc-data-row">
      <span className="dc-data-row__label">{label}</span>
      <span className="dc-data-row__value">{value}</span>
    </div>
  )
}
