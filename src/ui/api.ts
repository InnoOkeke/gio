import { en } from '../i18n/locales/en.js';
import { tr } from './lang-state';
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  /** 'redirect' means the AI helper kindly turned the request down; show it as a friendly note. */
  code?: string;
}

/** An error from the API. `redirect` is true when the turtle is steering the child to another idea. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly redirect = false,
  ) {
    super(message);
  }
}

export interface SharedProject {
  slug: string;
  title: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface OwnedProject extends SharedProject {
  editKey: string;
}

/** Turn any error shape the API returns (string, zod issues, object) into one readable sentence. */
function readError(error: unknown, status: number): string {
  if (typeof error === 'string') return error;
  if (Array.isArray(error)) {
    const first = error.find((e): e is { message: string } => typeof e?.message === 'string');
    if (first) return first.message;
  }
  if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  return status === 429 ? tr('error.tooMany') : tr('error.generic', { status });
}

/** English texts, kept for tests and scripts. What a child sees comes from offlineMessage() and slowMessage(), in their language. */
export const OFFLINE_MESSAGE = en.messages['error.offline'];
export const SLOW_MESSAGE = en.messages['error.slow'];
export const offlineMessage = (): string => tr('error.offline');
export const slowMessage = (): string => tr('error.slow');
/** API Gateway gives up after 30 s, so a request still open after 35 s is not coming back. */
export const REQUEST_TIMEOUT_MS = 35_000;

/** The request never reached GIO: no internet, a dropped connection, or no answer in time (`slow`). */
export class OfflineError extends Error {
  constructor(readonly reason: 'offline' | 'slow' = 'offline') {
    super(reason === 'slow' ? slowMessage() : offlineMessage());
    this.name = 'OfflineError';
  }
}

/** True only when the browser is sure there is no connection. */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function request<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  if (isOffline()) throw new OfflineError();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      throw new OfflineError(err instanceof Error && err.name === 'AbortError' ? 'slow' : 'offline');
    }
    const json = (await res.json().catch(() => ({ success: false }))) as Envelope<T>;
    if (controller.signal.aborted) throw new OfflineError('slow');
    if (!res.ok || !json.success || json.data === undefined) throw new ApiError(readError(json.error, res.status), json.code === 'redirect');
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

export type AssistantStyle = 'code' | 'blocks';

export interface HintChange {
  line: number;
  was: string | null;
  now: string | null;
}

export interface Hint {
  text: string;
  /** Level 2: the line GIO's own interpreter found the problem on. */
  line?: number;
  /** Level 3: the lines that change in the corrected program. */
  changes?: HintChange[];
}

export const api = {
  askTurtle: (prompt: string, code: string | undefined, style: AssistantStyle) => request<{ code: string }>('POST', '/api/ai/logo', { prompt, code, style }),
  explain: (code: string, style: AssistantStyle) => request<{ text: string }>('POST', '/api/ai/explain', { code, style }),
  hint: (level: 1 | 2 | 3, code: string, style: AssistantStyle, questId?: string) => request<Hint>('POST', '/api/ai/hint', { level, code, style, questId }),
  createProject: (title: string, code: string) => request<OwnedProject>('POST', '/api/projects', { title, code }),
  updateProject: (slug: string, editKey: string, changes: { title?: string; code?: string }) =>
    request<SharedProject>('PUT', `/api/projects/${encodeURIComponent(slug)}`, changes, { 'X-Edit-Key': editKey }),
  getProject: (slug: string) => request<SharedProject>('GET', `/api/projects/${encodeURIComponent(slug)}`),
};

/* ---- Edit keys and drafts live only in this browser ---- */

const KEYS = 'gio.editKeys';
const DRAFT = 'gio.draft';

function readKeys(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEYS) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Unsaved edits of saved drawings, newest last, so an app update or a reload never loses them. */
export const UNSAVED = 'gio.unsaved';
export const MAX_UNSAVED = 50;
export interface UnsavedEdit {
  slug: string;
  title: string;
  code: string;
}

let full = false;
const fullListeners = new Set<() => void>();

/** True once this browser refused to store something because the phone (or the browser's share of it) is full. */
export function storageFull(): boolean {
  return full;
}

export function onStorageFull(listener: () => void): () => void {
  fullListeners.add(listener);
  return () => {
    fullListeners.delete(listener);
  };
}

/** Runs one storage write. A full phone is reported instead of thrown, so the drawing keeps working. */
function write(change: () => void): boolean {
  try {
    change();
    return true;
  } catch {
    if (!full) {
      full = true;
      for (const listener of fullListeners) listener();
    }
    return false;
  }
}

function readUnsaved(): UnsavedEdit[] {
  try {
    const list = JSON.parse(localStorage.getItem(UNSAVED) ?? '[]') as unknown;
    if (!Array.isArray(list)) return [];
    return list.filter((e): e is UnsavedEdit => typeof e?.slug === 'string' && typeof e?.title === 'string' && typeof e?.code === 'string');
  } catch {
    return [];
  }
}

export const local = {
  editKeyFor: (slug: string): string | undefined => readKeys()[slug],
  rememberEditKey(slug: string, editKey: string): boolean {
    return write(() => localStorage.setItem(KEYS, JSON.stringify({ ...readKeys(), [slug]: editKey })));
  },
  loadUnsaved(slug: string): { title: string; code: string } | null {
    const hit = readUnsaved().find((e) => e.slug === slug);
    return hit ? { title: hit.title, code: hit.code } : null;
  },
  saveUnsaved(slug: string, title: string, code: string): boolean {
    const list = [...readUnsaved().filter((e) => e.slug !== slug), { slug, title, code }];
    // Never drop a child's edit to make room: past the limit the phone is reported as full, and the old edits stay.
    return write(() => {
      if (list.length > MAX_UNSAVED) throw new Error('too many unsaved drawings');
      localStorage.setItem(UNSAVED, JSON.stringify(list));
    });
  },
  clearUnsaved(slug: string): boolean {
    const list = readUnsaved();
    if (!list.some((e) => e.slug === slug)) return true;
    const rest = list.filter((e) => e.slug !== slug);
    return write(() => (rest.length ? localStorage.setItem(UNSAVED, JSON.stringify(rest)) : localStorage.removeItem(UNSAVED)));
  },
  loadDraft(): { title: string; code: string } | null {
    try {
      const raw = localStorage.getItem(DRAFT);
      return raw ? (JSON.parse(raw) as { title: string; code: string }) : null;
    } catch {
      return null;
    }
  },
  saveDraft(title: string, code: string): boolean {
    return write(() => localStorage.setItem(DRAFT, JSON.stringify({ title, code })));
  },
  clearDraft(): boolean {
    return write(() => localStorage.removeItem(DRAFT));
  },
};
