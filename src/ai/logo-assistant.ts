import { execute, NAMED_COLORS, PRIMITIVES } from '../logo/index.js';
import { chat, type ChatMessage } from './bedrock.js';

/** The canvas shows x and y from -CANVAS_HALF to +CANVAS_HALF. */
export const CANVAS_HALF = 300;

export interface LogoRequest {
  /** What the child asked for, in their own words. */
  prompt: string;
  /** The program currently in the editor, when the child asks for a change. */
  code?: string;
}

function commandReference(): string {
  return PRIMITIVES.map((p) => {
    const names = [p.name, ...p.aliases].join(' / ');
    return `- ${names}${p.arity ? ` (${p.arity} input${p.arity > 1 ? 's' : ''})` : ''}${p.kind === 'reporter' ? ' [reports a value]' : ''}: ${p.help}`;
  }).join('\n');
}

export function buildSystemPrompt(): string {
  const colors = Object.keys(NAMED_COLORS).map((c) => `"${c.toLowerCase()}`).join(' ');
  return [
    'You are the turtle helper in GIO, an app where children learn to program by drawing with Logo, the language Seymour Papert created for kids.',
    'A child describes a drawing in their own words. You reply with a Logo program that draws it.',
    '',
    'Write ONLY in this Logo dialect. Any other command is an error:',
    commandReference(),
    '- REPEAT n [ commands ]: repeat the commands n times (n is a whole number)',
    '- TO name :input1 :input2 … END: teach a new command; call it later with its inputs',
    '- MAKE "name value: store a value; read it back with :name',
    '- IF condition [ commands ] and IFELSE condition [ yes ] [ no ]; conditions use < > =',
    '- STOP: leave the current command early',
    '- Arithmetic: + - * / and parentheses. Comments start with ;',
    `- Colours: ${colors}, a number 0-15, or a list like [255 128 0]`,
    '',
    'Rules:',
    '1. Reply with the Logo program only. No explanations, no markdown fences.',
    '2. The first line must be a comment with a short, cheerful title for the drawing, like ; Rainbow Flower',
    '3. Add a few short comments a child could read, explaining the main steps.',
    '4. Use TO procedures with clear names when a shape repeats. Prefer REPEAT over copying lines.',
    `5. The turtle starts at 0 0 in the middle, facing up. Keep every point between -${CANVAS_HALF - 40} and ${CANVAS_HALF - 40} so the drawing fits.`,
    '6. Keep it quick to draw: at most a few thousand moves in total. Never write a loop or recursion that does not end.',
    '7. Make it colourful and fun, and keep it simple enough for a child to read.',
    '8. If the request is not something to draw, or is not suitable for children, draw a smiling sun instead and title it ; Let\'s draw something fun!',
  ].join('\n');
}

function stripCodeFence(text: string): string {
  const match = /^\s*```[\w-]*\s*\n([\s\S]*?)\n?```\s*$/.exec(text);
  return (match ? match[1]! : text).trim();
}

function firstMessage(req: LogoRequest): string {
  if (req.code && req.code.trim()) {
    return `Here is my program:\n${req.code}\n\nChange it so that: ${req.prompt}\nReply with the whole new program.`;
  }
  return `Draw this: ${req.prompt}`;
}

/** Problems with AI output that the model is allowed one try to fix. */
function validate(code: string): string | null {
  const res = execute(code);
  if (!res.ok) {
    const sourceLine = code.split('\n')[res.problem.line - 1]?.trim() ?? '';
    return `line ${res.problem.line} (\`${sourceLine}\`): ${res.problem.message}`;
  }
  const outOfBounds = res.result.events.some((e) => Math.abs(e.state.x) > CANVAS_HALF || Math.abs(e.state.y) > CANVAS_HALF);
  if (outOfBounds) return `the drawing goes off the canvas; keep every point between -${CANVAS_HALF} and ${CANVAS_HALF}`;
  if (!res.result.events.some((e) => e.type === 'line')) return 'the program does not draw anything';
  return null;
}

/**
 * Turns a child's request into a Logo program that GIO has already parsed and run successfully.
 * If the model's first answer has a problem, it gets one chance to fix it using GIO's own error message.
 * If that also fails, the real problem is thrown; GIO never substitutes a made-up program.
 */
export async function generateLogo(req: LogoRequest): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: firstMessage(req) },
  ];

  let problem = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const code = stripCodeFence(await chat(messages, { maxTokens: 1200, temperature: 0.4 }));
    const issue = validate(code);
    if (!issue) return code;
    problem = issue;
    if (process.env['NODE_ENV'] !== 'production') {
      console.warn(`[ai/logo] attempt ${attempt} rejected: ${issue}\n${code}`);
    }
    messages.push({ role: 'assistant', content: code }, { role: 'user', content: `GIO could not use that program: ${issue}. Reply with the whole corrected program only.` });
  }
  throw new Error(`The turtle helper wrote a program GIO couldn't use (${problem}). Try asking in a different way.`);
}
