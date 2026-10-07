# sketchcards

A small, free-to-run flashcard app with a **draw-your-answer** mode.

Make your own decks. Cards are either classic **Flip** cards (read the front, flip, grade yourself) or **Draw** cards: a canvas sits next to the prompt, you sketch the answer from memory, flip, and see your drawing beside the correct answer (or overlaid on it). Spaced repetition decides what to review each day, and everything syncs between devices, so you can build decks on a laptop and study with an Apple Pencil on an iPad.

**Use it at [sketchcards-mu.vercel.app](https://sketchcards-mu.vercel.app).**

![Studying a Draw card: the prompt on the left, the learner's sketch with the reference answer overlaid on the right](docs/screenshot.png)

## Features

- **Decks and cards**: text and images on either side (upload, or paste with ⌘/Ctrl+V; images are resized and converted to WebP in the browser), tags, search, duplicate, move between decks.
- **Draw mode**: a pressure-sensitive canvas (Apple Pencil, finger, or mouse) with pen, eraser, undo/redo, and palm rejection. After flipping, compare side by side or toggle an overlay of the reference at 40% opacity. Your sketches are never saved.
- **Sketched answers**: "Draw on back" in the editor lets you sketch the reference answer itself. Sketches are stored as stroke data and rendered as SVG, so they stay tiny, sharp, and follow light/dark mode.
- **Spaced repetition** (SM-2 style): grade each card Missed / Close / Got it. Missed cards come back in the same session until you get them. Up to N new cards per day (default 10, adjustable per deck).
- **Sync and offline**: Supabase is the source of truth; a local IndexedDB copy makes the app open instantly and keeps working through brief offline periods (changes sync when you're back).
- **Import/export**: CSV import (`front,back,tags`) with a preview; JSON export/import per deck, including images and sketches; a full backup from Settings.
- **Installable PWA**: add it to your iPad home screen. Light and dark mode, keyboard shortcuts (Space to flip, 1/2/3 to grade, O for overlay).

## Tech stack

React + Vite + TypeScript, plain CSS · Supabase (Auth, Postgres, Storage) with Row Level Security · [`perfect-freehand`](https://github.com/steveruizok/perfect-freehand) for strokes · `vite-plugin-pwa` · Vitest · deployable as a static site (e.g. Vercel). No custom server.

## Using it on an iPad

- Open [sketchcards-mu.vercel.app](https://sketchcards-mu.vercel.app) in Safari, tap **Share → Add to Home Screen**, and launch it from the home screen.
- **Sign in inside the home-screen app with Google** if you can. iPadOS keeps the home-screen app's storage separate from Safari's, and a magic link from Mail opens in Safari, which signs Safari in, not the app.
- Draw cards use the Apple Pencil's pressure. Once the Pencil touches the canvas, finger touches on it are ignored, so you can rest your palm.

## Importing cards

- **CSV**: open a deck → **Deck settings → Import CSV**. Use the columns `front,back,tags`; separate tags with `;`, and quote fields that contain commas or line breaks. You'll see a preview, with any problem rows listed, before anything is saved. CSV import creates text cards only.
- **JSON**: **Import deck** on the Decks page accepts files from **Export deck** or **Export backup** (Settings), which include images, sketches, and scheduling progress.
- **Sample deck**: new accounts start with a short Welcome deck that shows how flipping, grading, and drawing work. Delete it whenever you like; **Add sample deck** brings it back.

### Example: an amino acid Draw deck

[`examples/amino-acids.json`](examples/amino-acids.json) is one example of a Draw deck. It has the 20 standard amino acids, with the name and 3-/1-letter codes on the front and the skeletal structure on the back. Import it with **Import deck**.

The structures were generated once with RDKit by [`scripts/generate_amino_acids.py`](scripts/generate_amino_acids.py). Python and RDKit are not needed to build or run the app. The structures are drawn in neutral (non-zwitterionic) form, as L-isomers. Spot-check them against your course materials before relying on them.

## Project layout

```
src/
  data/        Supabase sync, IndexedDB cache, images (no UI)
  srs/         Scheduler, daily queue, session logic (pure, unit-tested)
  draw/        Stroke rendering and hit-testing
  io/          CSV, JSON deck format, import/export, sample deck
  components/  DrawPad canvas, card faces, dialogs
  pages/       Screens
supabase/      schema.sql (tables, RLS, storage), CLI config
examples/      Optional example decks
scripts/       One-off generators (not needed to run the app)
```

## License

[MIT](LICENSE)
