import { loadAllLocales } from '../src/i18n/index.js';

// The app loads languages other than English on demand. Tests check all of them, so load them first.
await loadAllLocales();
