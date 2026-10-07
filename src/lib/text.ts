/** Split "a, b; c" into unique, trimmed tags. */
export function parseTags(s: string): string[] {
  return [...new Set(s.split(/[,;|]/).map((t) => t.trim()).filter(Boolean))]
}
