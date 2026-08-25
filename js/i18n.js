// Translations.
//
// To add a language: add a key to STRINGS with every key that 'en' has, and
// add its tag to SUPPORTED. Nothing else needs to change — detectLanguage()
// picks it up automatically when the browser reports a matching tag.

export const SUPPORTED = ['en', 'nl'];

const STRINGS = {
    en: {
        'app.title': 'Vocal Warmup',
        'exercise.select.ariaLabel': 'Exercise',
        'theme.ariaLabel': 'Colour theme',
        'theme.switchTo': 'Switch to {theme} theme',
        'theme.light': 'light',
        'theme.dark': 'dark',
        'lang.ariaLabel': 'Language',
        'key.label': 'current key',
        'progress.ariaLabel': 'Sequence progress',
        'direction.ariaLabel': 'Direction — neither pressed stays in the current key',
        'direction.down.ariaLabel': 'Transpose down each sequence',
        'direction.down.title': 'Down',
        'direction.up.ariaLabel': 'Transpose up each sequence',
        'direction.up.title': 'Up',
        'reset.ariaLabel': 'Reset exercise',
        'back.ariaLabel': 'Previous sequence',
        'playpause.play': 'Play',
        'playpause.pause': 'Pause',
        'forward.ariaLabel': 'Next sequence',
        'startingKey.label': 'Starting key',
        'keyInfo.ariaLabel': 'What is the starting key?',
        'keyInfo.tooltip': 'Key of the exercise — sequences climb its scale. Saved as the starting key for all exercises.',
        'tempo.label': 'Tempo',
        'tempo.unit': 'BPM',
        'aTempo.label': 'a tempo',
        'footer.text': 'Space = play/pause · ← / → = previous / next sequence · ↑ / ↓ = direction',
        'status.loading': 'Loading piano…',
        'status.audioError': 'Could not start audio: {message}',
        'status.rangeEnd': 'Reached the end of the range.',
        'status.rangeEndPickKey': 'Reached the end of the range — pick a new key to continue.',
        'exercise.five-note-scale': 'Five-Note Scale',
        'exercise.octave-arpeggio': 'Octave Arpeggio',
        'exercise.sustained-fifth': 'Sustained Fifth',
        'exercise.octave-siren': 'Octave Siren (lip trill)',
    },
    nl: {
        'app.title': 'Zangwarming-up',
        'exercise.select.ariaLabel': 'Oefening',
        'theme.ariaLabel': 'Kleurthema',
        'theme.switchTo': 'Overschakelen naar {theme} thema',
        'theme.light': 'licht',
        'theme.dark': 'donker',
        'lang.ariaLabel': 'Taal',
        'key.label': 'huidige toonsoort',
        'progress.ariaLabel': 'Voortgang van de reeks',
        'direction.ariaLabel': 'Richting — geen van beide ingedrukt blijft in dezelfde toonsoort',
        'direction.down.ariaLabel': 'Elke reeks omlaag transponeren',
        'direction.down.title': 'Omlaag',
        'direction.up.ariaLabel': 'Elke reeks omhoog transponeren',
        'direction.up.title': 'Omhoog',
        'reset.ariaLabel': 'Oefening resetten',
        'back.ariaLabel': 'Vorige reeks',
        'playpause.play': 'Afspelen',
        'playpause.pause': 'Pauzeren',
        'forward.ariaLabel': 'Volgende reeks',
        'startingKey.label': 'Begintoonsoort',
        'keyInfo.ariaLabel': 'Wat is de begintoonsoort?',
        'keyInfo.tooltip': 'Toonsoort van de oefening — reeksen doorlopen de toonladder ervan. Wordt opgeslagen als begintoonsoort voor alle oefeningen.',
        'tempo.label': 'Tempo',
        'tempo.unit': 'BPM',
        'aTempo.label': 'a tempo',
        'footer.text': 'Spatie = afspelen/pauzeren · ← / → = vorige / volgende reeks · ↑ / ↓ = richting',
        'status.loading': 'Piano wordt geladen…',
        'status.audioError': 'Kon audio niet starten: {message}',
        'status.rangeEnd': 'Einde van het bereik bereikt.',
        'status.rangeEndPickKey': 'Einde van het bereik bereikt — kies een nieuwe toonsoort om verder te gaan.',
        'exercise.five-note-scale': 'Vijftonige Toonladder',
        'exercise.octave-arpeggio': 'Octaafarpeggio',
        'exercise.sustained-fifth': 'Aangehouden Kwint',
        'exercise.octave-siren': 'Octaafsirene (liptriller)',
    },
};

let currentLang = 'en';

/** 'nl' if the browser reports a Dutch-family tag, otherwise 'en'. */
export function detectLanguage() {
    const tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    return tags.some((tag) => tag && tag.toLowerCase().startsWith('nl')) ? 'nl' : 'en';
}

export function setLang(lang) {
    currentLang = SUPPORTED.includes(lang) ? lang : 'en';
}

export function getLang() {
    return currentLang;
}

/** Looks up `key` in the active language, falling back to English, with `{var}` substitution. */
export function t(key, vars) {
    let str = STRINGS[currentLang][key] ?? STRINGS.en[key] ?? key;
    if (vars) {
        for (const [name, value] of Object.entries(vars)) {
            str = str.replaceAll(`{${name}}`, value);
        }
    }
    return str;
}

/** Applies translations to every element with data-i18n / data-i18n-attr under `root`. */
export function applyTranslations(root) {
    for (const node of root.querySelectorAll('[data-i18n]')) {
        node.textContent = t(node.dataset.i18n);
    }
    for (const node of root.querySelectorAll('[data-i18n-attr]')) {
        for (const pair of node.dataset.i18nAttr.split(';')) {
            const [attr, key] = pair.split(':');
            node.setAttribute(attr, t(key));
        }
    }
}
