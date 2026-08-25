// Sampled piano playback. Salamander Grand samples every 3 semitones (see
// samples/piano/CREDITS.md); other pitches resample the nearest neighbour.

const SAMPLES = {
  A2: 45, C3: 48, Ds3: 51, Fs3: 54,
  A3: 57, C4: 60, Ds4: 63, Fs4: 66,
  A4: 69, C5: 72, Ds5: 75, Fs5: 78,
  A5: 81, C6: 84,
};
const SAMPLE_MIDIS = Object.values(SAMPLES).sort((a, b) => a - b);
const RELEASE_SEC = 0.45;

let ctx = null;
let master = null;
let loading = null;
const buffers = new Map(); // sample midi -> AudioBuffer
const active = new Set(); // sources still scheduled or sounding

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function now() {
  return ctx ? ctx.currentTime : 0;
}

export function isLoaded() {
  return buffers.size === SAMPLE_MIDIS.length;
}

/** Create/resume the AudioContext and load the samples. Call from a user gesture. */
export async function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') await ctx.resume();
  // Some browsers (notably Firefox, when a site's Autoplay permission is set
  // to block audio) resolve resume() without actually reaching 'running', so
  // the graph plays silently with no error anywhere else in the call chain.
  if (ctx.state !== 'running') {
    throw new Error('Audio is blocked for this site — check your browser’s autoplay/sound permissions');
  }
  await loadSamples();
  return ctx;
}

export function loadSamples() {
  if (!loading) {
    loading = Promise.all(
      Object.entries(SAMPLES).map(async ([name, midi]) => {
        // Resolve against this module, so the app works from any sub-path (e.g. GitHub Pages).
        const url = new URL(`../samples/piano/${name}.mp3`, import.meta.url);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Could not load sample ${name}.mp3`);
        buffers.set(midi, await ctx.decodeAudioData(await res.arrayBuffer()));
      })
    );
  }
  return loading;
}

function nearestSample(midi) {
  let best = SAMPLE_MIDIS[0];
  for (const m of SAMPLE_MIDIS) {
    if (Math.abs(m - midi) < Math.abs(best - midi)) best = m;
  }
  return best;
}

export function playNote(midi, startTime, durationSec, velocity = 1) {
  if (!ctx) return;
  const sampleMidi = nearestSample(midi);
  const buffer = buffers.get(sampleMidi);
  if (!buffer) return;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = Math.pow(2, (midi - sampleMidi) / 12);

  const env = ctx.createGain();
  env.gain.setValueAtTime(velocity * 0.85, startTime);
  // Let the sample ring for the note's length, then release rather than cut.
  env.gain.setValueAtTime(velocity * 0.85, startTime + durationSec);
  env.gain.linearRampToValueAtTime(0.0001, startTime + durationSec + RELEASE_SEC);

  src.connect(env);
  env.connect(master);
  src.start(startTime);
  src.stop(startTime + durationSec + RELEASE_SEC);
  active.add(src);
  src.onended = () => active.delete(src);
}

export function playChord(midis, startTime, durationSec, velocity = 1) {
  const scale = velocity / Math.sqrt(Math.max(midis.length, 1));
  midis.forEach((m, i) => {
    // A tiny roll makes the chord sound played rather than triggered.
    playNote(m, startTime + i * 0.012, durationSec, scale);
  });
}

/** Silence everything scheduled or sounding, with a short fade to avoid clicks. */
export function stopAll() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const fade = 0.04;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0.0001, t + fade);
  for (const src of active) {
    try {
      src.stop(t + fade);
    } catch (e) {
      /* already stopped */
    }
  }
  active.clear();
  master.gain.setValueAtTime(0.9, t + fade + 0.005);
}
