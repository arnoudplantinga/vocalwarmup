import { EXERCISES, getExercise } from './exercises.js';
import { MAX_MIDI, MIN_MIDI, Transport } from './scheduler.js';

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const DEFAULT_BPM = 82;
const DARK_QUERY = window.matchMedia('(prefers-color-scheme: dark)');
const STORE_KEY = 'vocal-warmup-settings';

const noteName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

const $ = (id) => document.getElementById(id);
const el = {
    exercise: $('exercise'),
    keyNow: $('key-now'),
    progress: document.querySelector('.progress'),
    progressFill: $('progress-fill'),
    status: $('status'),
    back: $('back'),
    playpause: $('playpause'),
    forward: $('forward'),
    reset: $('reset'),
    keyButton: $('key-button'),
    keyPicker: $('key-picker'),
    tempo: $('tempo'),
    tempoValue: $('tempo-value'),
    aTempo: $('a-tempo'),
    theme: $('theme'),
    dirUp: $('dir-up'),
    dirDown: $('dir-down'),
};

const settings = loadSettings();
const transport = new Transport(getExercise(settings.exerciseId), {
    tonicMidi: settings.startMidi,
    bpm: settings.bpm,
    direction: settings.direction,
});

function loadSettings() {
    const defaults = {
        startMidi: 60,
        bpm: DEFAULT_BPM,
        direction: 1,
        exerciseId: EXERCISES[0].id,
        theme: null, // no choice made yet: follow the device
    };
    try {
        return { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') };
    } catch (e) {
        return defaults;
    }
}

function saveSettings() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(settings));
    } catch (e) {
        /* storage unavailable (private mode, file://) — settings just won't persist */
    }
}

// --- rendering ---------------------------------------------------------

function renderKey() {
    el.keyNow.textContent = noteName(transport.displayRoot);
    el.keyButton.textContent = noteName(transport.tonicMidi);
    el.back.disabled = !transport.fits(transport.displayIndex - transport.skipDirection);
    el.forward.disabled = !transport.fits(transport.displayIndex + transport.skipDirection);
}

/** The palette in force: the stored choice, or the device preference until one is made. */
function currentTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    return DARK_QUERY.matches ? 'dark' : 'light';
}

function applyTheme() {
    const theme = currentTheme();
    if (settings.theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme; // let the media query decide
    // The button offers the other palette, so it shows that one's icon.
    const other = theme === 'dark' ? 'light' : 'dark';
    el.theme.textContent = other === 'dark' ? '☾' : '☀';
    el.theme.setAttribute('aria-label', `Switch to ${other} theme`);
    el.theme.title = `Switch to ${other} theme`;
}

function renderPlayState() {
    el.playpause.textContent = transport.playing ? '⏸' : '▶';
    el.playpause.setAttribute('aria-label', transport.playing ? 'Pause' : 'Play');
}

function renderPicker() {
    el.keyPicker.replaceChildren();
    for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
        const tonicBefore = transport.tonicMidi;
        transport.tonicMidi = midi;
        const usable = transport.fits(0);
        transport.tonicMidi = tonicBefore;
        if (!usable) continue;

        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = noteName(midi);
        b.className = midi === transport.tonicMidi ? 'active' : '';
        b.addEventListener('click', () => {
            closePicker();
            settings.startMidi = midi;
            saveSettings();
            transport.setTonic(midi);
            renderKey();
            status('');
        });
        el.keyPicker.append(b);
    }
}

function openPicker() {
    renderPicker();
    el.keyPicker.hidden = false;
    el.keyButton.setAttribute('aria-expanded', 'true');
}

function closePicker() {
    el.keyPicker.hidden = true;
    el.keyButton.setAttribute('aria-expanded', 'false');
}

function status(msg) {
    el.status.textContent = msg;
}

// --- wake lock -----------------------------------------------------------
// Keep the screen from sleeping mid-exercise; browsers without the API just
// keep their default behaviour.

let wakeLock = null;

async function acquireWakeLock() {
    if (!('wakeLock' in navigator) || wakeLock) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => (wakeLock = null));
    } catch (e) {
        wakeLock = null;
    }
}

async function releaseWakeLock() {
    if (!wakeLock) return;
    const lock = wakeLock;
    wakeLock = null;
    try {
        await lock.release();
    } catch (e) {
        /* already released */
    }
}

// The lock is dropped automatically when the tab is hidden; reclaim it on return.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && transport.playing) acquireWakeLock();
});

function frame() {
    const p = transport.progress();
    el.progressFill.style.width = `${(p * 100).toFixed(1)}%`;
    el.progress.setAttribute('aria-valuenow', Math.round(p * 100));
    requestAnimationFrame(frame);
}

// --- wiring ------------------------------------------------------------

for (const ex of EXERCISES) {
    const opt = document.createElement('option');
    opt.value = ex.id;
    opt.textContent = ex.name;
    el.exercise.append(opt);
}
el.exercise.value = transport.exercise.id;

el.exercise.addEventListener('change', () => {
    settings.exerciseId = el.exercise.value;
    saveSettings();
    transport.pause();
    setDirection(1);
    transport.setExercise(getExercise(settings.exerciseId));
    renderPlayState();
    renderKey();
});

el.playpause.addEventListener('click', async () => {
    closePicker();
    const starting = !transport.playing;
    if (starting) status('Loading piano…');
    try {
        await transport.toggle();
        if (starting) status('');
    } catch (e) {
        status('Could not start audio: ' + e.message);
    }
    if (transport.playing) acquireWakeLock();
    else releaseWakeLock();
    renderPlayState();
    renderKey();
});

el.back.addEventListener('click', () => skip(-1));
el.forward.addEventListener('click', () => skip(1));

el.reset.addEventListener('click', () => {
    closePicker();
    transport.reset();
    releaseWakeLock();
    renderPlayState();
    renderKey();
    status('');
});

function skip(delta) {
    closePicker();
    if (!transport.skip(delta)) {
        status('Reached the end of the range.');
        return;
    }
    status('');
    renderKey();
}

el.keyButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (el.keyPicker.hidden) openPicker();
    else closePicker();
});

// Close on any interaction outside the picker, including drags and scrolls.
for (const type of ['pointerdown', 'click']) {
    document.addEventListener(
        type,
        (e) => {
            if (el.keyPicker.hidden) return;
            if (el.keyPicker.contains(e.target) || el.keyButton.contains(e.target)) return;
            closePicker();
        },
        true
    );
}
window.addEventListener('blur', closePicker);

el.theme.addEventListener('click', () => {
    settings.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    saveSettings();
    applyTheme();
});

// Until a choice is made, follow the device if it changes while the page is open.
DARK_QUERY.addEventListener('change', () => {
    if (!settings.theme) applyTheme();
});

el.tempo.addEventListener('input', () => {
    const bpm = Number(el.tempo.value);
    el.tempoValue.textContent = bpm;
    transport.setBpm(bpm);
    settings.bpm = bpm;
    saveSettings();
});

el.aTempo.addEventListener('click', () => {
    el.tempo.value = DEFAULT_BPM;
    el.tempo.dispatchEvent(new Event('input'));
});

function setDirection(dir) {
    transport.setDirection(dir, { immediate: true });
    settings.direction = dir;
    saveSettings();
    for (const [button, value] of [
        [el.dirUp, 1],
        [el.dirDown, -1],
    ]) {
        button.classList.toggle('active', dir === value);
        button.setAttribute('aria-pressed', String(dir === value));
    }
    renderKey();
}

// The arrows are toggles: pressing the active one releases it, which stays in key,
// and pressing the other one takes over, so both can never be on at once.
el.dirUp.addEventListener('click', () => setDirection(transport.direction === 1 ? 0 : 1));
el.dirDown.addEventListener('click', () => setDirection(transport.direction === -1 ? 0 : -1));

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePicker();
        return;
    }
    if (e.target instanceof Element && e.target.matches('input, select')) return;
    if (e.code === 'Space') {
        e.preventDefault();
        el.playpause.click();
    } else if (e.code === 'ArrowRight') {
        el.forward.click();
    } else if (e.code === 'ArrowLeft') {
        el.back.click();
    } else if (e.code === 'ArrowUp') {
        e.preventDefault(); // otherwise the page scrolls
        el.dirUp.click();
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        el.dirDown.click();
    }
});

transport.onSequence = () => renderKey();
transport.onLimit = () => {
    releaseWakeLock();
    renderPlayState();
    renderKey();
    status('Reached the end of the range — pick a new key to continue.');
};

// --- init --------------------------------------------------------------

el.tempo.value = settings.bpm;
el.tempoValue.textContent = settings.bpm;
applyTheme();
setDirection(settings.direction);
renderPlayState();
renderKey();
requestAnimationFrame(frame);
