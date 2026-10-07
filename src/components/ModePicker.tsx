import type { AnswerMode } from '../data/types'

export default function ModePicker({
  value,
  onChange,
}: {
  value: AnswerMode
  onChange: (m: AnswerMode) => void
}) {
  return (
    <div className="segmented" role="group" aria-label="Answer mode">
      <button type="button" aria-pressed={value === 'flip'} onClick={() => onChange('flip')}>
        Flip
      </button>
      <button type="button" aria-pressed={value === 'draw'} onClick={() => onChange('draw')}>
        Draw
      </button>
    </div>
  )
}
