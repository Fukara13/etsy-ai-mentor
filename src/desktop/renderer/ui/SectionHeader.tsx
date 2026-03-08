/**
 * DC-5: Section header for card/section titles.
 */

import type { ReactNode } from 'react'

type Props = {
  title: string
  children?: ReactNode
}

export function SectionHeader({ title, children }: Props) {
  return (
    <div className="dc-section-header">
      <h2 className="dc-section-header__title">{title}</h2>
      {children != null ? <div className="dc-section-header__extra">{children}</div> : null}
    </div>
  )
}
