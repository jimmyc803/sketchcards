/** Each deck gets a stable pastel "divider tab" color, picked from its id. */
const COLORS = ['yellow', 'mint', 'pink', 'sky', 'lilac', 'peach'] as const

export function deckColor(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0
  return COLORS[Math.abs(h) % COLORS.length]
}
