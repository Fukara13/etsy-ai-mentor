/**
 * DC-5: Card container for grouped content.
 */

import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return <div className={`dc-card ${className}`.trim()}>{children}</div>
}
