import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import { isBlocked } from '../src/ai/blocklist.js';
import { parseVerdict } from '../src/ai/moderation.js';
import { takeDailySlot } from '../src/db/ai-usage.js';
import { initSchema } from '../src/db/schema.js';

describe('blocklist', () => {
  it.each([
    'draw a fuck',
    'draw SHIT',
    'sh1t',
    'f.u.c.k',
    'f u c k',
    'fuuuuck',
    'f*ck',
    '$ex',
    's e x',
    'draw a naked bitch',
    'a pussy cat in the nude',
    'putain',
    'kill myself',
    'ASS',
    'Shït',
  ])('blocks "%s"', (text) => {
    expect(isBlocked(text)).toBe(true);
  });

  it.each([
    'a big square',
    'a rainbow flower',
    'a classic class assassin glass',
    'Scunthorpe and Essex',
    'shiitake mushrooms',
    'a bass guitar and a passport',
    'cockpit of a plane',
    'kill the bug in my game',
    'a hello world',
    'FD 100 RT 90 REPEAT 4 [FD :size*2 RT 90]',
    'MAKE "a 4*5',
    'a dragon shooting fire at a castle',
    'la maison et le soleil',
    'un gato bonito',
    'one two three',
  ])('lets "%s" through', (text) => {
    expect(isBlocked(text)).toBe(false);
  });
});

describe('moderation verdict', () => {
  it('reads SAFE and UNSAFE answers', () => {
    expect(parseVerdict('SAFE')).toBe('safe');
    expect(parseVerdict(' safe.\n')).toBe('safe');
    expect(parseVerdict('UNSAFE')).toBe('unsafe');
    expect(parseVerdict('Unsafe: it asks for rude things')).toBe('unsafe');
  });

  it('refuses to guess when the answer is unclear (fail-closed)', () => {
    expect(() => parseVerdict('')).toThrow();
    expect(() => parseVerdict('I am not sure')).toThrow();
    expect(() => parseVerdict('maybe')).toThrow();
  });
});

describe('durable daily AI cap', () => {
  it('keeps counting after the database is closed and reopened', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gio-cap-'));
    const file = path.join(dir, 'cap.db');
    try {
      const first = new Database(file);
      initSchema(first);
      expect(takeDailySlot(first, '2030-01-01', 3)).toBe(true);
      expect(takeDailySlot(first, '2030-01-01', 3)).toBe(true);
      first.close(); // the server restarts

      const second = new Database(file);
      initSchema(second);
      expect(takeDailySlot(second, '2030-01-01', 3)).toBe(true);
      expect(takeDailySlot(second, '2030-01-01', 3)).toBe(false);
      expect(takeDailySlot(second, '2030-01-01', 3)).toBe(false);
      // A new UTC day starts again from zero.
      expect(takeDailySlot(second, '2030-01-02', 3)).toBe(true);
      expect(second.prepare('SELECT count FROM ai_daily_usage WHERE day = ?').get('2030-01-01')).toEqual({ count: 3 });
      second.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('forgets days older than 30 days', () => {
    const db = new Database(':memory:');
    initSchema(db);
    takeDailySlot(db, '2030-01-01', 5);
    takeDailySlot(db, '2030-03-01', 5);
    expect(db.prepare('SELECT day FROM ai_daily_usage').all()).toEqual([{ day: '2030-03-01' }]);
    db.close();
  });
});
