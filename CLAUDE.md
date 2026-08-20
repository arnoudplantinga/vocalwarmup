# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, client-side web app that plays piano accompaniment for vocal warmup exercises. Plain
HTML/CSS/JS with ES modules — no build step, no backend, no package.json.

## Dependencies

Keep dependencies to a minimum. This project intentionally has none (no npm packages, no
bundler, no framework) — prefer vanilla JS/CSS/DOM APIs over adding one. Don't introduce a
build step or a package.json unless there's no other way to accomplish the task.

## Commands

Serve over HTTP (required — ES modules and `fetch()` of the piano samples are blocked on
`file://`):

```sh
python3 -m http.server 8000       # or: uv run --no-project python -m http.server 8000
```

Then open <http://localhost:8000>. Audio starts on first click (browser autoplay policy), which
is also when the piano samples load. There is no test suite, linter, or build command.

## Deployment

Publish to GitHub Pages. `.github/workflows/pages.yml` deploys the repo as-is on every push to
`main` (no build step) via `actions/upload-pages-artifact` + `actions/deploy-pages`; enable it
once via **Settings → Pages → Build and deployment → Source: GitHub Actions**. It can also be
run by hand from the Actions tab. `.nojekyll` disables Jekyll processing. Asset paths (samples,
module imports) are resolved relative to the module/page, so a GitHub Pages sub-path
(`<user>.github.io/<repo>/`) needs no extra configuration.

## Architecture

Four ES modules under `js/`, each owning one concern:

- **`js/exercises.js`** — pure data/config: the `EXERCISES` array (each exercise is a chord
  start/end + a list of `{ interval, beats }` notes relative to a root, a scale, and a step
  mode) and `SCALES`. Also exports helpers (`rootForIndex`, `sequenceBeats`, `topInterval`,
  `bottomInterval`) used to compute pitches/durations without touching audio or DOM. Adding an
  exercise means appending one object here — nothing else changes.
- **`js/audio.js`** — sample playback. Loads the Salamander Grand Piano samples (one every 3
  semitones, `samples/piano/*.mp3`) into an `AudioContext`, resamples in-between pitches via
  `playbackRate`, and exposes `playNote`/`playChord`/`stopAll` plus the audio clock (`now()`).
  Sample URLs resolve via `import.meta.url` so the app works from any sub-path.
- **`js/scheduler.js`** — the `Transport` class: a lookahead scheduler (schedules ~150ms ahead,
  ticking every 25ms) that walks exercises one note/chord/rest event at a time on the audio
  clock. This is why tempo changes land within the lookahead window instead of waiting for the
  next sequence. Tracks sequence index, direction (up/down/stay-in-key), and a `timeline` of
  recently scheduled events used to derive playback progress. Enforces the singable range via
  `MIN_MIDI`/`MAX_MIDI` (C3–C6) and calls `onLimit`/`onSequence` callbacks.
- **`js/app.js`** — DOM wiring: transport controls, key/tempo/direction pickers, theme toggle,
  and `localStorage`-backed settings. This is the only module that touches the DOM.

Data flows one way: `exercises.js` (config) → `scheduler.js` (timing/sequencing, using
`audio.js` for actual sound) → `app.js` (UI, driving the `Transport`).

See `README.md` for user-facing behavior (controls, exercise table, how to add an exercise) —
it's kept in sync with the code and is a good reference before changing exercise/transport logic.
