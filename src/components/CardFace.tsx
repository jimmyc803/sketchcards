import type { Stroke } from '../data/types'
import CardImage from './CardImage'
import StrokesSvg from './StrokesSvg'

export interface FaceContent {
  text: string
  image: string | null
  /** Local preview URL for an image that hasn't been uploaded yet. */
  imagePreview?: string | null
  strokes?: Stroke[] | null
}

export default function CardFace({ content, side }: { content: FaceContent; side: 'front' | 'back' }) {
  const { text, image, imagePreview, strokes } = content
  const empty = !text.trim() && !image && !imagePreview && !strokes?.length
  return (
    <div className="face">
      {empty && <span className="muted">({side} is empty)</span>}
      {text.trim() && <div className="face-text">{text}</div>}
      {imagePreview ? (
        <img src={imagePreview} alt={`${side} image`} />
      ) : (
        image && <CardImage src={image} alt={`${side} image`} />
      )}
      {strokes && strokes.length > 0 && <StrokesSvg strokes={strokes} className="strokes" label={`${side} sketch`} />}
    </div>
  )
}
