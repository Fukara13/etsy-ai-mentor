/**
 * DC-5: Top header bar.
 */

type Props = {
  title: string
}

export function Topbar({ title }: Props) {
  return (
    <header className="dc-topbar">
      <h1 className="dc-topbar__title">{title}</h1>
    </header>
  )
}
