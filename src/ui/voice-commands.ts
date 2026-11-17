export type VoiceCommand =
  | 'run'
  | 'pause'
  | 'step'
  | 'slower'
  | 'faster'
  | 'zoom'
  | 'explain'
  | 'save'
  | 'clear'
  | 'new'
  | 'undo'
  | 'quests'
  | 'hint'
  | 'quiet'
  | 'talk';

/** Exact phrases only, so "draw a fast car" is a drawing, not the "faster" command. */
const PHRASES: Record<VoiceCommand, string[]> = {
  run: ['run', 'run it', 'go', 'play', 'start', 'do it', 'again', 'run again', 'play again', 'draw', 'show me'],
  pause: ['stop', 'pause', 'wait', 'hold on', 'stop it'],
  step: ['step', 'next step', 'one step', 'step by step'],
  slower: ['slower', 'slow', 'slow down', 'go slower', 'slowly'],
  faster: ['faster', 'fast', 'speed up', 'go faster', 'quicker'],
  zoom: ['zoom', 'super fast', 'really fast', 'very fast', 'rocket'],
  explain: ['explain', 'explain it', 'explain my code', 'what did i make', 'what does it do', 'tell me about it', 'how does it work'],
  save: ['save', 'save it', 'save my drawing'],
  clear: ['clear', 'clear it', 'clean', 'clean up', 'wipe it'],
  new: ['new', 'new drawing', 'start over', 'start again', 'something new'],
  undo: ['undo', 'go back', 'oops', 'undo that'],
  quests: ['quests', 'quest', 'show quests', 'open quests', 'challenges'],
  hint: ['hint', 'help', 'give me a hint', 'help me'],
  quiet: ['be quiet', 'stop talking', 'quiet', 'shh', 'shush'],
  talk: ['talk to me', 'read to me', 'read it', 'say it', 'talk'],
};

const LOOKUP = new Map<string, VoiceCommand>();
for (const [command, phrases] of Object.entries(PHRASES) as [VoiceCommand, string[]][]) {
  for (const p of phrases) LOOKUP.set(p, command);
}

/** Lower-case, drop punctuation and polite or wake words ("please", "hey Gio", "turtle"). */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z' ]+/g, ' ')
    .replace(/\b(please|hey|ok|okay|gio|geo|turtle|now|can you|could you)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseVoiceCommand(text: string): VoiceCommand | null {
  return LOOKUP.get(normalise(text)) ?? null;
}
