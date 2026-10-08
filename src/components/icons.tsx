import type { ReactNode, SVGProps } from 'react'

/** Small line icons (24×24, currentColor), drawn for this app. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const PenIcon = () => (
  <Icon>
    <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
)

export const EraserIcon = () => (
  <Icon>
    <path d="M8.5 20L3.8 15.3a1.6 1.6 0 010-2.3l9-9a1.6 1.6 0 012.3 0l5 5a1.6 1.6 0 010 2.3L11 20" />
    <path d="M8.5 20H20" />
    <path d="M7 11l6.5 6.5" />
  </Icon>
)

export const UndoIcon = () => (
  <Icon>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 010 12h-3" />
  </Icon>
)

export const RedoIcon = () => (
  <Icon>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H10a6 6 0 000 12h3" />
  </Icon>
)

export const TrashIcon = () => (
  <Icon>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12" />
    <path d="M9 7V4h6v3" />
  </Icon>
)

/** Paper icons double as previews in the paper menu. */
export function PaperIcon({ kind }: { kind: 'blank' | 'lined' | 'grid' | 'dots' }) {
  return (
    <Icon>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      {kind === 'lined' && <path d="M7 8h10M7 12h10M7 16h10" strokeWidth={1.5} />}
      {kind === 'grid' && <path d="M4 9h16M4 15h16M9.3 3v18M14.7 3v18" strokeWidth={1.2} />}
      {kind === 'dots' &&
        [8, 12, 16].flatMap((y) =>
          [8, 12, 16].map((x) => <circle key={`${x},${y}`} cx={x} cy={y} r={0.9} fill="currentColor" stroke="none" />),
        )}
    </Icon>
  )
}

/** Streak flame (filled, takes the current text color). */
export const FlameIcon = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M12.8 2.3c.3 2.6-.9 4.3-2.2 5.8C9.2 9.7 7.5 11.4 7.5 14.3A4.6 4.6 0 0012 19a4.6 4.6 0 004.5-4.7c0-1.3-.4-2.4-1-3.3.1 1.2-.4 2.3-1.4 2.7.3-2.9-.6-5.3-1.3-6.8 2.9 1.4 5.7 4.2 5.7 8.1A6.5 6.5 0 0112 21.5a6.5 6.5 0 01-6.5-6.6c0-3.5 2-5.6 3.6-7.3 1.3-1.4 2.5-2.7 2.5-4.6 0-.3.9-.9 1.2-.7z" />
  </svg>
)

/** Small inline icons for buttons and links (sized to the text). */
function Mini({ children }: { children: ReactNode }) {
  return (
    <Icon width={18} height={18} strokeWidth={2.2}>
      {children}
    </Icon>
  )
}

export const PlusIcon = () => (
  <Mini>
    <path d="M12 5v14M5 12h14" />
  </Mini>
)

export const BackIcon = () => (
  <Mini>
    <path d="M15 5l-7 7 7 7" />
  </Mini>
)

/** Study: a play triangle. */
export const StudyIcon = () => (
  <Mini>
    <path d="M8 5.5v13l10-6.5-10-6.5z" />
  </Mini>
)

/** Practice: a loop. */
export const PracticeIcon = () => (
  <Mini>
    <path d="M17 2l3 3-3 3" />
    <path d="M4 11V9a4 4 0 014-4h12" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M20 13v2a4 4 0 01-4 4H4" />
  </Mini>
)

/** A small stack of cards. */
export const CardsIcon = () => (
  <Mini>
    <rect x="3" y="7" width="14" height="13" rx="2" />
    <path d="M7 4h12a2 2 0 012 2v10" />
  </Mini>
)

export const GearIcon = () => (
  <Mini>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Mini>
)

export const ImageIcon = () => (
  <Mini>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M21 16l-5-5-9 9" />
  </Mini>
)

export const SketchIcon = () => (
  <Mini>
    <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
  </Mini>
)

/** Flip: a card turning over. */
export const FlipIcon = () => (
  <Mini>
    <rect x="4" y="5" width="16" height="14" rx="2" />
    <path d="M9 12h6M12.5 9.5L15 12l-2.5 2.5" />
  </Mini>
)
