import { useImage } from '../data/images'
import { isStoragePath } from '../data/store'

/** Shows a card image from Supabase Storage (cached offline) or a bundled/static URL. */
export default function CardImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const { src: url, failed } = useImage(src)
  if (failed) return <span className="muted">[image unavailable offline]</span>
  if (!url) return <span className="muted" aria-busy="true">Loading image…</span>
  // Bundled starter SVGs are black-on-transparent; they get inverted in dark mode.
  const bundled = !isStoragePath(src) && src.endsWith('.svg') ? 'bundled' : ''
  return <img src={url} alt={alt} className={`${className} ${bundled}`.trim()} draggable={false} />
}
