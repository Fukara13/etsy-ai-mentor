/**
 * DC-5: Left sidebar / navigation rail.
 */

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function Sidebar({ children }: Props) {
  return <aside className="dc-sidebar">{children}</aside>
}
