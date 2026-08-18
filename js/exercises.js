// Exercise definitions.
//
// To add an exercise, append one object to EXERCISES. Nothing else needs to change.
//   chord:     optional chord played before the pattern, intervals in semitones from the root
//   notes:     the pattern, each note an interval in semitones from the root plus a duration in beats
//   scale:     which scale the sequences walk through (see SCALES)
//   step:      how the root moves between sequences
//              { mode: 'scale', amount: 1 }     -> one scale degree (stays in key)
//              { mode: 'chromatic', amount: 1 } -> a fixed number of semitones
//   restBeats: silence after the pattern, before the next sequence starts

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

export const EXERCISES = [
    {
        id: 'five-note-scale',
        name: 'Five-Note Scale',
        chord: { intervals: [0, 4, 7], beats: 1 },
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
        scale: 'major',
        step: { mode: 'chromatic', amount: 1 },
        restBeats: 0,
    },
    {
        id: 'octave-arpeggio',
        name: 'Octave Arpeggio',
        chord: { intervals: [0, 4, 7], beats: 1 },
        notes: [
            { interval: 0, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 7, beats: 0.5 },
            { interval: 12, beats: 0.5 },
            { interval: 7, beats: 0.5 },
            { interval: 4, beats: 0.5 },
            { interval: 0, beats: 1 },
        ],
        scale: 'major',
        step: { mode: 'scale', amount: 1 },
        restBeats: 0.5,
    },
    {
        id: 'sustained-fifth',
        name: 'Sustained Fifth',
        chord: { intervals: [0, 4, 7], beats: 1 },
        notes: [
            { interval: 0, beats: 1 },
            { interval: 7, beats: 1 },
            { interval: 0, beats: 1 },
        ],
        scale: 'major',
        step: { mode: 'scale', amount: 1 },
        restBeats: 1,
    },
    {
        id: 'octave-siren',
        name: 'Octave Siren (lip trill)',
        chord: { intervals: [0, 4, 7], beats: 1 },
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
        scale: 'major',
        step: { mode: 'scale', amount: 1 },
        restBeats: 0.5,
    },
];

export function getExercise(id) {
    return EXERCISES.find((e) => e.id === id) || EXERCISES[0];
}

/** Total length of one sequence (chord + pattern + rest) in beats. */
export function sequenceBeats(exercise) {
    const chord = exercise.chord ? exercise.chord.beats : 0;
    const notes = exercise.notes.reduce((sum, n) => sum + n.beats, 0);
    return chord + notes + (exercise.restBeats || 0);
}

/** Highest interval the pattern reaches above its root, used for range clamping. */
export function topInterval(exercise) {
    const chordHigh = exercise.chord ? Math.max(...exercise.chord.intervals) : 0;
    return Math.max(...exercise.notes.map((n) => n.interval), chordHigh, 0);
}

/** Lowest interval the pattern reaches relative to its root (usually 0). */
export function bottomInterval(exercise) {
    const chordLow = exercise.chord ? Math.min(...exercise.chord.intervals) : 0;
    return Math.min(...exercise.notes.map((n) => n.interval), chordLow, 0);
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
