// Transport: schedules the exercise one note at a time on the audio clock, so a
// tempo change lands within the lookahead window rather than at the next sequence.

import { cancelScheduledAfter, ensureAudio, now, playChord, playNote, stopAll } from './audio.js';
import { bottomInterval, rootForIndex, sequenceBeats, topInterval } from './exercises.js';

const LOOKAHEAD_SEC = 0.15; // how far ahead we schedule
const TICK_MS = 25; // how often we check
const START_LEAD_SEC = 0.08; // breathing room before the first note

export const MIN_MIDI = 48; // C3
export const MAX_MIDI = 84; // C6

/** Opening chord, notes, closing chord and rest as one flat list of timed events. */
function eventsFor(exercise) {
  const events = [];
  const chord = (c) => ({ intervals: c.intervals, beats: c.beats, chord: true });
  if (exercise.chordStart) events.push(chord(exercise.chordStart));
  for (const n of exercise.notes) events.push({ intervals: [n.interval], beats: n.beats });
  if (exercise.chordEnd) events.push(chord(exercise.chordEnd));
  if (exercise.restBeats) events.push({ intervals: [], beats: exercise.restBeats });
  return events;
}

export class Transport {
  constructor(exercise, { tonicMidi = 60, bpm = 82, direction = 1 } = {}) {
    this.tonicMidi = tonicMidi; // the key of the exercise; sequence 0 starts here
    this.index = 0; // sequence being scheduled (steps along the scale)
    this.displayIndex = 0; // sequence currently sounding
    this.bpm = bpm;
    this.direction = 0; // +1 up, 0 stay in key, -1 down
    this.playing = false;
    this.timer = null;
    this.nextTime = 0; // audio time of the next event to schedule
    this.eventIdx = 0; // position within the current sequence
    this.beatOffset = 0; // beats elapsed in the current sequence
    this.timeline = []; // recently scheduled events, for progress and display
    this.onLimit = null; // called when the exercise runs out of range
    this.onSequence = null; // called when a new sequence starts sounding
    this.setDirection(direction);
    this.setExercise(exercise);
  }

  rootAt(index) {
    return rootForIndex(this.exercise, this.tonicMidi, index);
  }

  get displayRoot() {
    return this.rootAt(this.displayIndex);
  }

  /** Direction used by the skip buttons; holding still steps a degree at a time. */
  get skipDirection() {
    return this.direction || 1;
  }

  /** True if a sequence at this index stays inside the singable range. */
  fits(index) {
    const root = this.rootAt(index);
    return (
      root + topInterval(this.exercise) <= MAX_MIDI &&
      root + bottomInterval(this.exercise) >= MIN_MIDI
    );
  }

  sequenceDurationSec(bpm = this.bpm) {
    return (sequenceBeats(this.exercise) * 60) / bpm;
  }

  async play() {
    if (this.playing) return;
    await ensureAudio();
    this.playing = true;
    this.startSequenceAt(now() + START_LEAD_SEC);
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    this.timer = null;
    stopAll();
    // Resume from the sequence that was sounding, not the one already queued.
    this.index = this.displayIndex;
    this.timeline = [];
  }

  toggle() {
    return this.playing ? (this.pause(), Promise.resolve()) : this.play();
  }

  /** Stop playback and rewind the current exercise to its first sequence. */
  reset() {
    this.pause();
    this.setIndex(0, { immediate: true });
  }

  /** Jump one sequence in the current direction (+1 forward, -1 back). */
  skip(delta) {
    const target = this.displayIndex + this.skipDirection * delta;
    if (!this.fits(target)) return false;
    this.setIndex(target, { immediate: true });
    return true;
  }

  /** Set the key. Sequence numbering restarts from the new tonic. */
  setTonic(midi, { immediate = true } = {}) {
    this.tonicMidi = midi;
    this.setIndex(0, { immediate });
  }

  setIndex(index, { immediate = false } = {}) {
    this.index = index;
    if (!this.playing) {
      this.displayIndex = index;
      this.timeline = [];
      return;
    }
    if (immediate) {
      this.displayIndex = index; // the UI should follow straight away
      this.restart();
    }
  }

  restart() {
    stopAll();
    this.timeline = [];
    this.startSequenceAt(now() + START_LEAD_SEC);
    this.tick();
  }

  startSequenceAt(time) {
    this.nextTime = time;
    this.eventIdx = 0;
    this.beatOffset = 0;
  }

  setExercise(exercise) {
    this.exercise = exercise;
    this.events = eventsFor(exercise);
    this.totalBeats = sequenceBeats(exercise);
    this.setIndex(0, { immediate: true });
  }

  /**
   * Set the transpose direction. When playing, `immediate` skips straight to
   * the next sequence in the new direction as soon as the currently sounding
   * note/chord ends — it doesn't wait out the rest of the in-progress
   * sequence (its remaining notes, closing chord, and rest), but it also
   * doesn't cut off what's already ringing.
   */
  setDirection(dir, { immediate = false } = {}) {
    const next = Math.sign(dir) | 0; // -1 down, 0 stay, +1 up
    const changed = next !== this.direction;
    this.direction = next;
    if (immediate && changed && next !== 0 && this.playing) {
      const target = this.displayIndex + next;
      if (this.fits(target)) this.advanceTo(target);
    }
  }

  /**
   * Continue playback into `index` right after whatever is currently
   * sounding finishes, cancelling anything scheduled after that (which
   * hasn't started yet, so nothing audible is cut off) instead of playing
   * out the rest of the current sequence.
   */
  advanceTo(index) {
    const t = now();
    const current = this.eventAt(t);
    const cutoff = current ? current.time + current.beats * current.secPerBeat : t;
    cancelScheduledAfter(cutoff);
    this.timeline = this.timeline.filter((e) => e.time < cutoff);
    this.index = index;
    this.startSequenceAt(Math.max(cutoff, t));
    this.tick();
  }

  setBpm(bpm) {
    this.bpm = bpm; // applies to every event not yet scheduled
  }

  /** Schedule every event that starts within the lookahead window. */
  tick() {
    if (!this.playing) return;
    const t = now();

    while (this.nextTime < t + LOOKAHEAD_SEC) {
      if (this.eventIdx === 0 && !this.fits(this.index)) {
        this.pause();
        if (this.onLimit) this.onLimit();
        return;
      }
      const ev = this.events[this.eventIdx];
      const secPerBeat = 60 / this.bpm; // read fresh, so tempo changes take effect here
      const dur = ev.beats * secPerBeat;
      const root = this.rootAt(this.index);

      if (ev.chord) {
        playChord(ev.intervals.map((i) => root + i), this.nextTime, dur * 0.95, 0.9);
      } else if (ev.intervals.length) {
        playNote(root + ev.intervals[0], this.nextTime, dur * 0.92, 1);
      }

      this.timeline.push({
        seqIndex: this.index,
        time: this.nextTime,
        beats: ev.beats,
        beatOffset: this.beatOffset,
        secPerBeat,
      });

      this.nextTime += dur;
      this.beatOffset += ev.beats;
      this.eventIdx += 1;
      if (this.eventIdx >= this.events.length) {
        this.eventIdx = 0;
        this.beatOffset = 0;
        this.index += this.direction; // direction 0 repeats the same key
      }
    }

    this.timeline = this.timeline.filter((e) => e.time + e.beats * e.secPerBeat > t - 1);

    const current = this.eventAt(t);
    if (current && current.seqIndex !== this.displayIndex) {
      this.displayIndex = current.seqIndex;
      if (this.onSequence) this.onSequence(this.rootAt(current.seqIndex));
    }
  }

  eventAt(t) {
    let found = null;
    for (const e of this.timeline) {
      if (e.time <= t && (!found || e.time > found.time)) found = e;
    }
    return found;
  }

  /** 0..1 progress through the sequence currently sounding. */
  progress() {
    if (!this.playing) return 0;
    const t = now();
    const e = this.eventAt(t);
    if (!e) return 0;
    const beats = e.beatOffset + Math.min((t - e.time) / e.secPerBeat, e.beats);
    return Math.min(beats / this.totalBeats, 1);
  }
}
