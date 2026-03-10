import { useEffect, useRef } from 'react'

function sendBounds(el: HTMLDivElement | null) {
  if (!el || !window.electronAPI?.browserSetBounds) return
  const rect = el.getBoundingClientRect()
  if (rect.width > 0 && rect.height > 0) {
    window.electronAPI.browserSetBounds({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    })
  }
}

export default function BrowserPane() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    sendBounds(el)
    const ro = new ResizeObserver(() => sendBounds(el))
    if (el) ro.observe(el)
    const onResize = () => sendBounds(el)
    window.addEventListener('resize', onResize)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <div ref={ref} className="browser-pane" />
}
