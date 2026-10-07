import type { Card } from '../data/types'

/** Does the back have something to draw-compare against (a sketch or an image)? */
export function hasVisualReference(card: Card) {
  return Boolean(card.back_strokes?.length || card.back_image)
}
