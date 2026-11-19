import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MAX_ENTRIES, MAX_ENTRY_CHARS, PYTHON_KEY, clearPythonDocs, deletePythonDoc, readPythonDoc, writePythonDoc } from '../src/ui/python/doc.js';

class MemoryStorage {
  data = new Map<string, string>();
  failWrites = false;
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('quota');
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

let store: MemoryStorage;
beforeEach(() => {
  store = new MemoryStorage();
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = store;
});
afterEach(() => {
  delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
});

describe('gio.python', () => {
  it('writes, reads and deletes one entry', () => {
    expect(readPythonDoc('draft')).toBeNull();
    expect(writePythonDoc('draft', { code: 'forward(10)', forkedFrom: 'FD 10' })).toBe(true);
    expect(readPythonDoc('draft')).toEqual({ code: 'forward(10)', forkedFrom: 'FD 10' });
    expect(JSON.parse(store.getItem(PYTHON_KEY)!)).toEqual({ draft: { code: 'forward(10)', forkedFrom: 'FD 10' } });
    deletePythonDoc('draft');
    expect(readPythonDoc('draft')).toBeNull();
  });
  it('keeps projects apart', () => {
    writePythonDoc('square-abc', { code: 'a', forkedFrom: 'x' });
    writePythonDoc('star-xyz', { code: 'b', forkedFrom: 'y' });
    expect(readPythonDoc('square-abc')?.code).toBe('a');
    expect(readPythonDoc('star-xyz')?.code).toBe('b');
  });
  it('refuses an entry over 20 KB and keeps the old one', () => {
    writePythonDoc('draft', { code: 'old', forkedFrom: '' });
    expect(writePythonDoc('draft', { code: 'x'.repeat(MAX_ENTRY_CHARS + 1), forkedFrom: '' })).toBe(false);
    expect(readPythonDoc('draft')?.code).toBe('old');
    expect(writePythonDoc('draft', { code: 'x'.repeat(MAX_ENTRY_CHARS), forkedFrom: '' })).toBe(true);
  });
  it('drops the oldest entries past 20', () => {
    for (let k = 0; k < MAX_ENTRIES + 3; k++) writePythonDoc(`p${k}`, { code: String(k), forkedFrom: '' });
    expect(Object.keys(JSON.parse(store.getItem(PYTHON_KEY)!))).toHaveLength(MAX_ENTRIES);
    expect(readPythonDoc('p0')).toBeNull();
    expect(readPythonDoc('p2')).toBeNull();
    expect(readPythonDoc('p3')?.code).toBe('3');
    expect(readPythonDoc(`p${MAX_ENTRIES + 2}`)?.code).toBe(String(MAX_ENTRIES + 2));
  });
  it('writing an entry again makes it the newest', () => {
    for (let k = 0; k < MAX_ENTRIES; k++) writePythonDoc(`p${k}`, { code: String(k), forkedFrom: '' });
    writePythonDoc('p0', { code: 'again', forkedFrom: '' });
    writePythonDoc('new', { code: 'n', forkedFrom: '' });
    expect(readPythonDoc('p0')?.code).toBe('again');
    expect(readPythonDoc('p1')).toBeNull();
  });
  it('never throws on bad JSON, wrong shapes or a full browser', () => {
    for (const bad of ['{not json', '[]', '"text"', '5', 'null', '{"draft": 5}', '{"draft": {"code": 1}}']) {
      store.setItem(PYTHON_KEY, bad);
      expect(readPythonDoc('draft')).toBeNull();
      expect(writePythonDoc('draft', { code: 'ok', forkedFrom: '' })).toBe(true);
      expect(readPythonDoc('draft')?.code).toBe('ok');
      clearPythonDocs();
    }
    store.failWrites = true;
    expect(writePythonDoc('draft', { code: 'ok', forkedFrom: '' })).toBe(false);
    expect(() => deletePythonDoc('draft')).not.toThrow();
  });
  it('does not throw when there is no localStorage at all', () => {
    delete (globalThis as unknown as { localStorage?: MemoryStorage }).localStorage;
    expect(readPythonDoc('draft')).toBeNull();
    expect(writePythonDoc('draft', { code: 'x', forkedFrom: '' })).toBe(false);
    expect(() => clearPythonDocs()).not.toThrow();
    expect(() => deletePythonDoc('draft')).not.toThrow();
  });
  it('keeps other entries when one is bad', () => {
    store.setItem(PYTHON_KEY, JSON.stringify({ good: { code: 'a', forkedFrom: 'b' }, bad: 7 }));
    expect(readPythonDoc('good')).toEqual({ code: 'a', forkedFrom: 'b' });
    clearPythonDocs();
    expect(readPythonDoc('good')).toBeNull();
  });
});
