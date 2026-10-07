import type { SVGProps } from 'react'

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
