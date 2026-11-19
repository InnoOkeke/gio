/**
 * A child's own Python ("Make it mine") lives only in this browser, in localStorage under gio.python:
 * { [key]: { code, forkedFrom } }, where key is "draft" or a project slug and forkedFrom is the Logo it was copied from.
 * It is never sent to GIO's server and is not part of Save or Share. Nothing here ever throws.
 */
export const PYTHON_KEY = 'gio.python';
export const MAX_ENTRY_CHARS = 20_000;
export const MAX_ENTRIES = 20;

export interface PythonDoc {
  code: string;
  /** The Logo source this Python was copied from, to notice when the Logo has changed since. */
  forkedFrom: string;
}

type Store = Record<string, PythonDoc>;

function isDoc(value: unknown): value is PythonDoc {
  return typeof value === 'object' && value !== null && typeof (value as PythonDoc).code === 'string' && typeof (value as PythonDoc).forkedFrom === 'string';
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(PYTHON_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    const store: Store = {};
    for (const [key, value] of Object.entries(parsed)) if (isDoc(value)) store[key] = { code: value.code, forkedFrom: value.forkedFrom };
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): boolean {
  try {
    localStorage.setItem(PYTHON_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function readPythonDoc(key: string): PythonDoc | null {
  return readStore()[key] ?? null;
}

/** Saves one entry. Returns false when it is too big or the browser would not store it. The oldest entries go first. */
export function writePythonDoc(key: string, doc: PythonDoc): boolean {
  if (doc.code.length > MAX_ENTRY_CHARS) return false;
  const store = readStore();
  delete store[key];
  store[key] = { code: doc.code, forkedFrom: doc.forkedFrom };
  const keys = Object.keys(store);
  for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete store[old];
  return writeStore(store);
}

export function deletePythonDoc(key: string): void {
  const store = readStore();
  if (!(key in store)) return;
  delete store[key];
  writeStore(store);
}

export function clearPythonDocs(): void {
  try {
    localStorage.removeItem(PYTHON_KEY);
  } catch {
    /* nothing to clear */
  }
}
