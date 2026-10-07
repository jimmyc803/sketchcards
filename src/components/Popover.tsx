import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A small panel anchored under its trigger. Closes on outside tap, Escape, or when `onClose` is
 * called by the content (e.g. after choosing an option).
 */
export default function Popover({
  open,
  onClose,
  trigger,
  children,
  label,
  align = 'start',
}: {
  open: boolean
  onClose: () => void
  trigger: ReactNode
  children: ReactNode
  label: string
  align?: 'start' | 'end'
}) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLElement>('.popover [aria-pressed="true"], .popover button')?.focus()
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  return (
    <div className="popover-anchor" ref={root}>
      {trigger}
      {open && (
        <div className={`popover popover-${align}`} role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  )
}
