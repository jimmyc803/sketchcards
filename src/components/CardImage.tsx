import { useImage } from '../data/images'

/** Shows a card image from Supabase Storage (cached offline) or a plain URL. */
export default function CardImage({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  const { src: url, failed } = useImage(src)
  if (failed) return <span className="muted">[image unavailable offline]</span>
  if (!url) return <span className="muted" aria-busy="true">Loading image…</span>
  // SVG line art (e.g. chemical structures) is usually black on transparent: invert it in dark mode.
  const svg = /\.svg$|^data:image\/svg/i.test(src) ? 'svg-art' : ''
  return <img src={url} alt={alt} className={`${className} ${svg}`.trim()} draggable={false} />
}
