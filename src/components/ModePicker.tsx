import type { AnswerMode } from '../data/types'
import { FlipIcon, SketchIcon } from './icons'

const MODES: { mode: AnswerMode; label: string; hint: string; icon: () => React.JSX.Element }[] = [
  { mode: 'flip', label: 'Flip', hint: 'Think of the answer, then flip', icon: FlipIcon },
  { mode: 'draw', label: 'Draw', hint: 'Sketch the answer, then compare', icon: SketchIcon },
]

/** How a card is answered when studying. Each option says what it does. */
export default function ModePicker({
  value,
  onChange,
}: {
  value: AnswerMode
  onChange: (m: AnswerMode) => void
}) {
  return (
    <div className="mode-picker" role="radiogroup" aria-label="How you'll answer">
      {MODES.map(({ mode, label, hint, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={value === mode}
          className="mode-option"
          onClick={() => onChange(mode)}
        >
          <Icon />
          <span>
            <b>{label}</b>
            <small>{hint}</small>
          </span>
        </button>
      ))}
    </div>
  )
}
