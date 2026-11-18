import { describe, it, expect } from 'vitest';
import { parseVoiceCommand } from '../src/ui/voice-commands.js';

describe('voice commands', () => {
  it.each([
    ['run it', 'run'],
    ['Run it!', 'run'],
    ['play again', 'run'],
    ['Stop.', 'pause'],
    ['please go slower', 'slower'],
    ['hey Gio, faster', 'faster'],
    ['super fast', 'zoom'],
    ['What did I make?', 'explain'],
    ['save it please', 'save'],
    ['start over', 'new'],
    ['oops', 'undo'],
    ['give me a hint', 'hint'],
    ["I'm stuck", 'hint'],
    ['im stuck', 'hint'],
    ['I am stuck!', 'hint'],
    ['stuck', 'hint'],
    ['I need help', 'hint'],
    ['help me', 'hint'],
    ['be quiet', 'quiet'],
    ['talk to me', 'talk'],
  ])('"%s" is the %s command', (text, command) => {
    expect(parseVoiceCommand(text)).toBe(command);
  });

  it.each(['draw a fast car', 'make it run around in circles', 'a stop sign', 'draw a slow snail', 'a big star', 'make a game where I save the princess'])(
    '"%s" is a drawing request, not a command',
    (text) => {
      expect(parseVoiceCommand(text)).toBeNull();
    },
  );
});
