/** When was the Pencil last on a drawing canvas? Used to ignore palm taps near the canvas. */
let lastPenAt = 0

export function notePenActivity() {
  lastPenAt = Date.now()
}

export function penRecentlyActive(withinMs = 1200) {
  return Date.now() - lastPenAt < withinMs
}
