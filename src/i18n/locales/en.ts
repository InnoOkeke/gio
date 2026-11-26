import type { Locale } from '../types.js';

/**
 * English is the source of truth: every other language must have exactly these keys (the type
 * `Messages` is derived from this object) and the same {placeholders}.
 * Short labels (keys starting btn. or nav.) are length-checked by tests/i18n.test.ts.
 */
export const messages = {
  /* ---- Language picker ---- */
  'lang.choose': 'Which language do you want to use?',
  'lang.button': 'Language: {name}',
  'lang.selected': 'selected',
  'lang.row': 'Language',

  /* ---- Common short labels ---- */
  'btn.close': 'Close',
  'btn.more': 'More',
  'btn.share': 'Share',
  'btn.newDrawing': 'New drawing',
  'btn.run': 'Run',

  /* ---- First screen (age mode picker) ---- */
  'mode.title': "Who's coding today?",
  'mode.subtitle': 'Pick one. You can switch any time.',
  'mode.little': 'Little Turtles',
  'mode.coder': 'Turtle Coders',
  'mode.age.little': 'Under 8',
  'mode.age.coder': '8 to 12',
  'mode.blurb.little': 'Snap colourful blocks together, or just say what to draw.',
  'mode.blurb.coder': 'Write real code, then see it in Python and JavaScript.',
  'mode.tag.blocks': 'Blocks',
  'mode.tag.talk': 'Talk to the turtle',
  'mode.tag.picture': 'Picture quests',
  'mode.tag.logo': 'Logo',
  'mode.tag.python': 'Python',
  'mode.tag.javascript': 'JavaScript',
  'mode.tag.coding': 'Coding quests',
  'mode.art.forward': 'forward 50',
  'mode.art.right': 'turn right',
  'mode.art.repeat': 'repeat 4',
  'mode.privacy': 'Privacy for parents',

  /* ---- Studio header, More sheet ---- */
  'more.switchMode': 'Switch mode ({mode})',

  /* ---- Command key row ---- */
  'keys.toolbar': 'Logo command keys',
  'keys.type': 'Type {label}: {hint}',
  'keys.runAria': 'Run the program',
  'keys.hint.forward': 'forward',
  'keys.hint.back': 'back',
  'keys.hint.right': 'turn right',
  'keys.hint.left': 'turn left',
  'keys.hint.repeat': 'repeat the commands inside the brackets',
  'keys.hint.brackets': 'brackets',
  'keys.hint.digit': 'digit {d}',
  'keys.hint.number': 'a number',
  'keys.hint.penup': 'pen up',
  'keys.hint.pendown': 'pen down',
  'keys.hint.run': 'run the program',

  /* ---- Command shelf ---- */
  'shelf.groups': 'Command groups',
  'shelf.insert': 'Insert {code}: {hint}',
  'shelf.insertColour': 'Insert pen colour {name}',
  'shelf.group.move': 'Move',
  'shelf.group.turn': 'Turn',
  'shelf.group.pen': 'Pen',
  'shelf.group.magic': 'Magic',
  'shelf.group.music': 'Music',
  'shelf.group.movie': 'Movie',
  'shelf.group.game': 'Game',
  'shelf.group.colours': 'Colours',
  'shelf.hint.forward': 'Walk forward 50 steps',
  'shelf.hint.back': 'Walk backward 50 steps',
  'shelf.hint.right': 'Turn right a quarter turn',
  'shelf.hint.left': 'Turn left a quarter turn',
  'shelf.hint.penup': 'Pen up: move without drawing',
  'shelf.hint.pendown': 'Pen down: draw again',
  'shelf.hint.size': 'Make the line thicker',
  'shelf.hint.repeat': 'Do the commands inside [ ] 4 times',
  'shelf.hint.circle': 'Draw a circle around the turtle',
  'shelf.hint.play3': 'Play three notes, one after another',
  'shelf.hint.playLong': 'Play notes; the 2 makes the last one twice as long',
  'shelf.hint.tempo': 'Play the notes slower (bigger numbers are faster)',
  'shelf.hint.frame': 'Show this picture, then hold it a moment',
  'shelf.hint.wait': 'Wait half a second (60 is one second)',
  'shelf.hint.clean': 'Wipe the picture to start the next one',
  'shelf.hint.when': 'Do the commands inside [ ] when the up arrow is pressed',

  /* ---- Privacy page: only the language paragraph for now ---- */
  'privacy.lang':
    'The language a child picks (English, Naijá Pidgin, Français or Español) is kept in the browser (the key is called gio.lang). GIO never saves it on its server. It is sent with each request to the turtle helper and to the server only as a request header, so answers come back in that language. Clearing the browser\u2019s site data removes it.',
};

export type Messages = typeof messages;

export const en: Locale = { lang: 'en', messages, words: {} };
