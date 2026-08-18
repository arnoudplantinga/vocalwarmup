# Vocal Warmup

A static web app that plays piano accompaniment for vocal warmups. No build step, no backend.

## Run

```sh
python3 -m http.server 8000       # or: uv run --no-project python -m http.server 8000
```

Then open <http://localhost:8000>. Audio starts on the first click (browser autoplay policy),
which is also when the piano samples are loaded.

It must be served over HTTP — opening `index.html` from disk fails, because ES modules and
`fetch()` of the samples are blocked on `file://`.

## Controls

- **Progress bar** — position within the current sequence (chord + pattern + rest).
- **◀◀ / ▶ / ▶▶** — previous sequence, play/pause, next sequence. Space and ← / → do the same.
- **Key** — the key of the exercise. Sequences walk up (or down) that key's scale, so from C4 the
  roots go C D E F G A B C. Also saved as the starting key for every exercise. Close the picker by
  choosing a key, pressing Escape, or clicking anywhere outside it.
- **Tempo** — 40–160 BPM, default 100 (`DEFAULT_BPM` in `js/app.js`); *a tempo* snaps back to it.
  Changes apply within ~150 ms, mid-note if need be.
- **Up / Stay / Down** — whether each sequence moves a scale degree up, repeats the same key, or
  moves down. Default Up. The skip buttons still step a degree at a time while holding.

Settings persist in `localStorage`.

## Exercises

| Exercise | Pattern (from the root) | Length at 100 BPM |
| --- | --- | --- |
| Semitone Ladder | chromatic, up 4 semitones and back | 7.8 s |
| Five-Note Scale | 1 2 3 4 5 4 3 2 1 | 8.4 s |
| Octave Arpeggio | 1 3 5 8 5 3 1 | 7.2 s |
| Sustained Fifth | root, fifth, root — four beats each | 9.6 s |
| Octave Siren (lip trill) | scale run up an octave and back, eighth notes | 7.5 s |

Each is preceded by a major chord on the sequence root, and every sequence moves one degree up
(or down) the key's scale.

## Adding an exercise

Append one object to `EXERCISES` in `js/exercises.js`; nothing else changes.

```js
{
  id: 'octave-arpeggio',
  name: 'Octave Arpeggio',
  chord: { intervals: [0, 4, 7], beats: 2 },  // played before the pattern; omit for none
  notes: [                                    // interval = semitones from the root
    { interval: 0, beats: 1 },
    { interval: 4, beats: 1 },
    { interval: 7, beats: 1 },
    { interval: 12, beats: 2 },
  ],
  scale: 'major',                     // scale the sequences walk through (SCALES in the same file)
  step: { mode: 'scale', amount: 1 }, // one scale degree per sequence
                                      // or { mode: 'chromatic', amount: 1 } for fixed semitones
  restBeats: 1,                       // silence before the next sequence
}
```

Roots are clamped so the whole pattern stays between C3 and C6 (`MIN_MIDI` / `MAX_MIDI` in
`js/scheduler.js`); playback stops with a message when the exercise runs out of range.

## Layout

| File | Purpose |
| --- | --- |
| `index.html`, `styles.css` | markup and styling |
| `js/exercises.js` | exercise definitions |
| `js/audio.js` | sample playback (loads `samples/piano`, resamples for in-between notes) |
| `samples/piano/` | Salamander Grand Piano notes every 3 semitones, CC-BY (see `CREDITS.md`) |
| `js/scheduler.js` | lookahead scheduler and transport state |
| `js/app.js` | DOM wiring and `localStorage` settings |
