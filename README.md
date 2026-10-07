<div align="center">

<img src="public/icon.svg" width="72" alt="" />

# sketchcards

**Flashcards you can draw.**<br />
Sketch the answer from memory, flip, and compare. Spaced repetition decides what's due.

### [Open the app →](https://sketchcards-mu.vercel.app)

</div>

![Studying a Draw card on iPad: the prompt on the left, a hand-drawn triangle with the reference overlaid on lined paper](docs/hero.png)

<table>
  <tr>
    <td width="50%"><img src="docs/decks.png" alt="Deck list" /><br /><sub><b>Your decks, synced</b>: build on a laptop, study on an iPad.</sub></td>
    <td width="50%"><img src="docs/editor.png" alt="Card editor with a sketched answer" /><br /><sub><b>Sketch the answer</b> right on the card, in color.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/dark.png" alt="Comparing a drawing with the reference in dark mode" /><br /><sub><b>Draw, flip, compare</b>, side by side or overlaid. Light or dark.</sub></td>
    <td width="50%"><img src="docs/toolbar.png" alt="Drawing toolbar with the color menu open on dot paper" /><br /><sub><b>Made for Apple Pencil</b>: pressure, palm rejection, colors, paper.</sub></td>
  </tr>
</table>

## Features

- ✏️ **Draw cards**: sketch from memory, then check against the answer
- 🔁 **Spaced repetition**: Missed / Close / Got it schedules each card
- 🎯 **Practice mode**: drill any deck without touching your schedule
- ☁️ **Syncs everywhere** and works offline
- 📲 **Installable**: add it to your iPad home screen
- 📥 **Import / export**: CSV, or full JSON decks with images and sketches

## Tips

- **iPad:** open the app in Safari → **Share → Add to Home Screen**, then sign in with Google.
- **Try a Draw deck:** import [`examples/amino-acids.json`](examples/amino-acids.json), which has the 20 amino acids with their structures (generated with RDKit; spot-check them against your textbook).
- **Shortcuts:** <kbd>Space</kbd> flips · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> grade · <kbd>O</kbd> toggles the overlay

<sub>Built with React, Vite, TypeScript, Supabase and <a href="https://github.com/steveruizok/perfect-freehand">perfect-freehand</a> · <a href="LICENSE">MIT license</a></sub>
