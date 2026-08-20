// Exercise definitions.
//
// To add an exercise, append one object to EXERCISES. Nothing else needs to change.
//   chordStart: optional chord played before the pattern, intervals in semitones from the root
//   chordEnd:   optional chord played after the pattern, same shape as chordStart
//   notes:     the pattern, each note an interval in semitones from the root plus a duration in beats
//   scale:     which scale the sequences walk through (see SCALES)
//   step:      how the root moves between sequences
//              { mode: 'scale', amount: 1 }     -> one scale degree (stays in key)
//              { mode: 'chromatic', amount: 1 } -> a fixed number of semitones
//   restBeats: silence after the closing chord, before the next sequence starts

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

export const EXERCISES = [
    {
        id: 'five-note-scale',
        name: 'Five-Note Scale',
        chordStart: { intervals: [0, 4, 7], beats: 2 },
        notes: [
            { interval: 0, beats: 0.5 },
            { interval: 2, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 5, beats: 0.5 },
            { interval: 7, beats: 0.5 },
            { interval: 5, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 2, beats: 0.5 },
            { interval: 0, beats: 1 },
        ],
        chordEnd: { intervals: [0, 4, 7], beats: 1 },
        scale: 'major',
        step: { mode: 'chromatic', amount: 1 },
        restBeats: 0,
    },
    {
        id: 'octave-arpeggio',
        name: 'Octave Arpeggio',
        chordStart: { intervals: [0, 4, 7], beats: 2 },
        notes: [
            { interval: 0, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 7, beats: 0.5 },
            { interval: 12, beats: 0.5 },
            { interval: 7, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 0, beats: 1 },
        ],
        chordEnd: { intervals: [0, 4, 7], beats: 1 },
        scale: 'major',
        step: { mode: 'chromatic', amount: 1 },
        restBeats: 0.5,
    },
    {
        id: 'sustained-fifth',
        name: 'Sustained Fifth',
        chordStart: { intervals: [0, 4, 7], beats: 1 },
        notes: [
            { interval: 0, beats: 1 },
            { interval: 7, beats: 1 },
            { interval: 0, beats: 1 },
        ],
        chordEnd: { intervals: [0, 4, 7], beats: 1 },
        scale: 'major',
        step: { mode: 'chromatic', amount: 1 },
        restBeats: 1,
    },
    {
        id: 'octave-siren',
        name: 'Octave Siren (lip trill)',
        chordStart: { intervals: [0, 4, 7], beats: 1 },
        notes: [
            { interval: 0, beats: 0.25 },
            { interval: 2, beats: 0.25 },
            { interval: 4, beats: 0.25 },
            { interval: 5, beats: 0.25 },
            { interval: 7, beats: 0.25 },
            { interval: 9, beats: 0.25 },
            { interval: 11, beats: 0.25 },
            { interval: 12, beats: 0.5 },
            { interval: 11, beats: 0.25 },
            { interval: 9, beats: 0.25 },
            { interval: 7, beats: 0.25 },
            { interval: 5, beats: 0.25 },
            { interval: 4, beats: 0.25 },
            { interval: 2, beats: 0.25 },
            { interval: 0, beats: 1 },
        ],
        chordEnd: { intervals: [0, 4, 7], beats: 1 },
        scale: 'major',
        step: { mode: 'chromatic', amount: 1 },
        restBeats: 0.5,
    },
];

export function getExercise(id) {
    return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

/** The chords of an exercise, skipping the ones it does not define. */
export function chordsOf(exercise) {
    return [exercise.chordStart, exercise.chordEnd].filter(Boolean);
}

/** Total length of one sequence (chords + pattern + rest) in beats. */
export function sequenceBeats(exercise) {
    const chords = chordsOf(exercise).reduce((sum, c) => sum + c.beats, 0);
    const notes = exercise.notes.reduce((sum, n) => sum + n.beats, 0);
    return chords + notes + (exercise.restBeats || 0);
}

/** Highest interval the sequence reaches above its root, used for range clamping. */
export function topInterval(exercise) {
    const chordHigh = chordsOf(exercise).flatMap((c) => c.intervals);
    return Math.max(...exercise.notes.map((n) => n.interval), ...chordHigh, 0);
}

/** Lowest interval the sequence reaches relative to its root (usually 0). */
export function bottomInterval(exercise) {
    const chordLow = chordsOf(exercise).flatMap((c) => c.intervals);
    return Math.min(...exercise.notes.map((n) => n.interval), ...chordLow, 0);
}

/** MIDI note `degree` scale steps above the tonic; degrees wrap into further octaves. */
export function degreeToMidi(tonicMidi, degree, scaleName = 'major') {
    const scale = SCALES[scaleName] || SCALES.major;
    const n = scale.length;
    const octave = Math.floor(degree / n);
    const index = ((degree % n) + n) % n;
    return tonicMidi + octave * 12 + scale[index];
}

/** Root of sequence number `index` (0 = the tonic), following the exercise's step rule. */
export function rootForIndex(exercise, tonicMidi, index) {
    const step = exercise.step || { mode: 'scale', amount: 1 };
    if (step.mode === 'chromatic') return tonicMidi + index * step.amount;
    return degreeToMidi(tonicMidi, index * step.amount, exercise.scale);
}
