import type { Card, Stroke } from '../data/types'
import CardImage from './CardImage'
import StrokesSvg from './StrokesSvg'

/** The reference answer drawn into a 4:3 board, so it lines up with the user's drawing. */
function Reference({ card, className }: { card: Card; className?: string }) {
  if (card.back_strokes?.length) return <StrokesSvg strokes={card.back_strokes} className={className} label="Reference sketch" />
  if (card.back_image) return <CardImage src={card.back_image} alt="Reference answer" className={className} />
  return <div className={`ref-text ${className ?? ''}`}>{card.back_text || '(no reference on the back)'}</div>
}

export default function Compare({ card, drawing, overlay }: { card: Card; drawing: Stroke[]; overlay: boolean }) {
  const mine = drawing.length ? (
    <StrokesSvg strokes={drawing} label="Your drawing" />
  ) : (
    <div className="ref-text muted">You didn't draw anything</div>
  )

  if (overlay) {
    return (
      <figure className="board" aria-label="Your drawing with the reference overlaid">
        {mine}
        <Reference card={card} className="overlay" />
      </figure>
    )
  }
  return (
    <div className="compare">
      <figure>
        <figcaption>Your drawing</figcaption>
        <div className="board">{mine}</div>
      </figure>
      <figure>
        <figcaption>Reference</figcaption>
        <div className="board">
          <Reference card={card} />
        </div>
      </figure>
    </div>
  )
}
