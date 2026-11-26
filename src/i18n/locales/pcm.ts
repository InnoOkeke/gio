import type { Locale } from '../types.js';
import type { Messages } from './en.js';

/*
 * NAIJÁ PIDGIN (Nigerian Pidgin): the one file to review.
 *
 * Everything a child reads or says in Pidgin lives here. It is a first draft written to sound
 * like everyday spoken Pidgin, NOT English with changed spelling. Please read each section and
 * change anything that does not sound right to you. Sections, in order:
 *   1. SCREEN TEXT        buttons, titles, hints (FEAT-001 now; more screens come in FEAT-002)
 *   2. LOGO COMMAND WORDS the words kids type (FD stays FD; GO, COMEBACK ... are proposals)
 * FEAT-002/FEAT-003 will add here: quest and level text, Logo error text, voice phrases,
 * number words, kid-safe terms and the helper instructions.
 * Keep {name} style markers exactly as they are. Code words are CAPITAL letters without accents.
 */

/* ===================== 1. SCREEN TEXT ===================== */
const messages: Messages = {
  /* ---- Language picker ---- */
  'lang.choose': 'Which language you wan use?',
  'lang.button': 'Language: {name}',
  'lang.selected': 'don choose am',
  'lang.row': 'Language',

  /* ---- Common short labels ---- */
  'btn.close': 'Close am',
  'btn.more': 'More',
  'btn.share': 'Share am',
  'btn.newDrawing': 'New drawing',
  'btn.run': 'Run am',

  /* ---- First screen ---- */
  'mode.title': 'Who dey code today?',
  'mode.subtitle': 'Pick one. You fit change am any time.',
  'mode.little': 'Small Turtles',
  'mode.coder': 'Turtle Coders',
  'mode.age.little': 'Under 8',
  'mode.age.coder': '8 reach 12',
  'mode.blurb.little': 'Join colour-colour blocks together, or just talk wetin you wan draw.',
  'mode.blurb.coder': 'Write correct code, then see am for Python and JavaScript.',
  'mode.tag.blocks': 'Blocks',
  'mode.tag.talk': 'Yarn the turtle',
  'mode.tag.picture': 'Picture quests',
  'mode.tag.logo': 'Logo',
  'mode.tag.python': 'Python',
  'mode.tag.javascript': 'JavaScript',
  'mode.tag.coding': 'Code quests',
  'mode.art.forward': 'go front 50',
  'mode.art.right': 'turn right',
  'mode.art.repeat': 'do am 4 times',
  'mode.privacy': 'Privacy for parents',

  /* ---- Studio header, More sheet ---- */
  'more.switchMode': 'Change mode ({mode})',

  /* ---- Command key row ---- */
  'keys.toolbar': 'Logo command keys',
  'keys.type': 'Type {label}: {hint}',
  'keys.runAria': 'Run the program',
  'keys.hint.forward': 'go front',
  'keys.hint.back': 'come back',
  'keys.hint.right': 'turn right',
  'keys.hint.left': 'turn left',
  'keys.hint.repeat': 'do the commands inside the brackets again and again',
  'keys.hint.brackets': 'brackets',
  'keys.hint.digit': 'number {d}',
  'keys.hint.number': 'one number',
  'keys.hint.penup': 'lift the pen',
  'keys.hint.pendown': 'put the pen down',
  'keys.hint.run': 'run the program',

  /* ---- Command shelf ---- */
  'shelf.groups': 'Command groups',
  'shelf.insert': 'Put {code}: {hint}',
  'shelf.insertColour': 'Put pen colour {name}',
  'shelf.group.move': 'Move',
  'shelf.group.turn': 'Turn',
  'shelf.group.pen': 'Pen',
  'shelf.group.magic': 'Magic',
  'shelf.group.music': 'Music',
  'shelf.group.movie': 'Film',
  'shelf.group.game': 'Game',
  'shelf.group.colours': 'Colours',
  'shelf.hint.forward': 'Waka go front 50 steps',
  'shelf.hint.back': 'Waka come back 50 steps',
  'shelf.hint.right': 'Turn right small small, one quarter',
  'shelf.hint.left': 'Turn left small small, one quarter',
  'shelf.hint.penup': 'Lift pen: waka without drawing',
  'shelf.hint.pendown': 'Drop pen: draw again',
  'shelf.hint.size': 'Make the line fat',
  'shelf.hint.repeat': 'Do wetin dey inside [ ] 4 times',
  'shelf.hint.circle': 'Draw one circle round the turtle',
  'shelf.hint.play3': 'Play three notes, one after the other',
  'shelf.hint.playLong': 'Play notes; the 2 go make the last one long double',
  'shelf.hint.tempo': 'Play the notes slow (bigger number mean e go fast)',
  'shelf.hint.frame': 'Show this picture, then hold am small',
  'shelf.hint.wait': 'Wait half a second (60 na one second)',
  'shelf.hint.clean': 'Clear the picture make you start the next one',
  'shelf.hint.when': 'Do wetin dey inside [ ] when you press the up arrow',

  /* ---- Privacy page ---- */
  'privacy.lang':
    'The language wey pikin choose (English, Naijá Pidgin, Français or Español) dey stay inside the browser (the key na gio.lang). GIO no dey keep am for im server at all. E dey follow every request go the turtle helper and the server only as request header, so make the answer come back for that language. If you clear the site data for the browser, e go comot.',
};

/* ===================== 2. LOGO COMMAND WORDS ===================== */
/*
 * The words a child can type in place of the English ones. English words always work too.
 * Format: COMMAND: [full word, short word]. Where the short word is the English one (FD, BK ...)
 * it is on purpose: the keys and blocks keep FD, BK, RT, LT, PU, PD for Pidgin.
 * RIGHT, LEFT, HOME, SHOW, STOP, IF and WHEN are already the same as English, so they are not listed.
 * All of these are proposals for you to review. Change a word here and nothing else needs to change.
 */
const words = {
  FORWARD: ['GO', 'FD'],
  BACK: ['COMEBACK', 'BK'],
  RIGHT: ['RIGHT', 'RT'],
  LEFT: ['LEFT', 'LT'],
  PENUP: ['LIFTPEN', 'PU'],
  PENDOWN: ['DROPPEN', 'PD'],
  CLEARSCREEN: ['WIPE', 'CS'],
  CLEAN: ['SWEEP'],
  SETPENCOLOR: ['PENCOLOUR'],
  SETPENSIZE: ['PENFAT'],
  SETBACKGROUND: ['BACKCOLOUR'],
  SETHEADING: ['FACE'],
  SETXY: ['JUMPXY'],
  SETX: ['JUMPX'],
  SETY: ['JUMPY'],
  HIDETURTLE: ['HIDEMAN'],
  SHOWTURTLE: ['SHOWMAN'],
  PRINT: ['WRITE'],
  GAMEOVER: ['GAMEDONE'],
  PLAY: ['SING'],
  WAIT: ['HOLD'],
  FRAME: ['SNAP'],
  RANDOM: ['ANYHOW'],
  REPCOUNT: ['WHICHROUND'],
  HEADING: ['WHERETOFACE'],
  SENTENCE: ['JOIN'],
  TO: ['TEACH'],
  END: ['FINISH'],
  REPEAT: ['DOAGAIN'],
  MAKE: ['KEEP'],
} as const;

export const pcm: Locale = { lang: 'pcm', messages, words };
