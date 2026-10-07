import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

/** A small "⋯" actions menu: closes on outside click, Escape, or after choosing an item. */
export default function DeckMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    function onDown(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function onMenuKey(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const els = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])]
    const i = els.indexOf(document.activeElement as HTMLButtonElement)
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus()
  }

  return (
    <div className="menu" ref={root}>
      <button
        ref={button}
        className="btn ghost small menu-button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open && (
        <div className="menu-list" role="menu" onKeyDown={onMenuKey}>
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              className={item.danger ? 'danger' : ''}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
