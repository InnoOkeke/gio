import type { Params } from './format.js';

/**
 * The English text of every Logo error, by key. Each throw site in src/logo builds its message from one of these,
 * so the English stays byte for byte what it was, and the UI can show the same error in the child's language from
 * each locale's `logoErrors`. A {name} that appears twice must get the same value both times.
 */
export const LOGO_ERRORS = {
  /* ---- lexer ---- */
  'lex.number': '"{text}" doesn\'t look like a number.',
  'lex.quote': 'A quote mark (") needs a word right after it, like "red.',
  'lex.colon': 'A colon (:) needs a name right after it, like :size.',
  'lex.char': 'I don\'t understand the character "{ch}".',
  /* ---- parser ---- */
  'parse.gate': "{word} isn't part of this level. Here you can use: {words}.",
  'parse.twice': 'You taught me {name} twice. Give the second one a different name.',
  'parse.toName': 'TO needs a name for your new command, like TO SQUARE.',
  'parse.isWord': '{name} is already a Logo word. Pick a different name for your command.',
  'parse.noEnd': 'TO {name} needs an END to finish it.',
  'parse.endBefore': 'TO {name} needs an END before you start teaching another command.',
  'parse.list': '{owner} needs a list of commands in square brackets, like [FD 50 RT 90].',
  'parse.listClose': 'The [ after {owner} needs a matching ] to close it.',
  'parse.strayClose': 'There is a ] without a matching [.',
  'parse.extraNumber': "There's an extra number here ({shown}) with no command to use it. Check that the command before it has the right number of inputs.",
  'parse.unexpected': 'I wasn\'t expecting "{text}" here. Lines should start with a command, like FD or REPEAT.',
  'parse.toNested': 'TO can only be used at the top level, not inside another command.',
  'parse.endAlone': 'There is an END without a TO before it.',
  'parse.make': 'MAKE needs a name with a quote mark, like MAKE "size 50.',
  'parse.when': 'WHEN needs a key: "up, "down, "left, "right or "space, like WHEN "up [FD 10]. Or use WHEN "tick to do something 10 times a second.',
  'parse.reporter': '{name} gives back a value. Use it inside a command, like FD {name}{example}.',
  'parse.dash': "Names can't have a dash (-) in them, because - means minus. Try {first}_{second} instead.",
  'parse.glued': 'Put a space between {word} and {n}, like {word} {n}.',
  'parse.unknownHint': "I don't know how to {word}. Did you mean {hint}?",
  'parse.unknown': "I don't know how to {word}. You can teach me with TO {word} \u2026 END.",
  'parse.moreInputs': '{owner} needs more inputs.',
  'parse.paren': 'The ( needs a matching ) to close it.',
  'parse.inputBefore': '{owner} needs an input before {word}. Try something like {owner} 50.',
  'parse.inputBeforeClose': '{owner} needs an input before the ].',
  'parse.inputFound': '{owner} needs an input, but found "{text}".',
  'parse.listOpen': 'The [ needs a matching ] to close it.',
  /* ---- interpreter ---- */
  'run.ops': 'Your program ran {n} steps, so I stopped it. Is a REPEAT or command repeating forever?',
  'run.showMinute': 'Your show is longer than {n} minute, so I stopped it. Try shorter notes or fewer WAITs.',
  'run.showMinutes': 'Your show is longer than {n} minutes, so I stopped it. Try shorter notes or fewer WAITs.',
  'run.showSeconds': 'Your show is longer than {n} seconds, so I stopped it. Try shorter notes or fewer WAITs.',
  'run.events': "That's a lot of drawing! I stopped after {n} moves. Try smaller numbers in your REPEAT.",
  'run.repeatCount': 'REPEAT needs a whole number of times, like REPEAT 4. You gave {value}.',
  'run.ifCond': 'IF needs a question that is true or false, like IF :size > 50. Got {value}.',
  'run.depth': '{name} called itself {n} times deep, so I stopped. Add an IF with STOP so it knows when to finish.',
  'run.varHint': "I don't know :{name}. Did you mean :{hint}?",
  'run.var': 'I don\'t know :{name} yet. Make it first with MAKE "{name} 50.',
  'run.circle': 'The circle needs a size bigger than 0.',
  'run.penSize': 'Pen size should be between 1 and 100. You gave {value}.',
  'run.tempo': 'SETTEMPO needs a number from 20 to 300 beats a minute, like SETTEMPO 120. You gave {value}.',
  'run.wait': 'WAIT needs a number from 0 to 600 (60 is one second). You gave {value}.',
  'run.unknown': "I don't know how to {name} yet.",
  'run.divZero': "You can't divide by zero.",
  'run.op': "I don't understand {op}.",
  'run.random': 'RANDOM needs a whole number bigger than 0, like RANDOM 10. You gave {value}.',
  'run.repcount': 'REPCOUNT only works inside a REPEAT.',
  'run.sqrt': "SQRT can't take a number below zero.",
  'run.tooBig': 'That number is too big for {owner}.',
  'run.needsNumber': '{owner} needs a number, but got "{value}".',
  'run.colourNumber': 'Colour numbers go from 0 to 15. You gave {value}.',
  'run.colourHint': 'I don\'t know the colour "{value}". Did you mean "{hint}?',
  'run.colour': 'I don\'t know the colour "{value}". Try "red, "blue or "green.',
  'run.colourNeeds': '{owner} needs a colour like "red, a number from 0 to 15, or [255 0 0].',
} as const;

export type LogoErrorKey = keyof typeof LOGO_ERRORS;

/** Fill a template's {name} markers. */
export function fillTemplate(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** The English message of a Logo error. */
export function logoErrorText(key: LogoErrorKey, params: Params = {}): string {
  return fillTemplate(LOGO_ERRORS[key], params);
}
