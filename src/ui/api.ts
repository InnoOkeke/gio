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
  return status === 429 ? 'Too many tries. Please wait a moment.' : `Something went wrong (${status}).`;
}

async function request<T>(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach GIO right now. Check your internet connection.");
  }
  const json = (await res.json().catch(() => ({ success: false }))) as Envelope<T>;
  if (!res.ok || !json.success || json.data === undefined) throw new ApiError(readError(json.error, res.status), json.code === 'redirect');
  return json.data;
}

export type AssistantStyle = 'code' | 'blocks';

export const api = {
  askTurtle: (prompt: string, code: string | undefined, style: AssistantStyle) => request<{ code: string }>('POST', '/api/ai/logo', { prompt, code, style }),
  explain: (code: string, style: AssistantStyle) => request<{ text: string }>('POST', '/api/ai/explain', { code, style }),
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

export const local = {
  editKeyFor: (slug: string): string | undefined => readKeys()[slug],
  rememberEditKey(slug: string, editKey: string) {
    localStorage.setItem(KEYS, JSON.stringify({ ...readKeys(), [slug]: editKey }));
  },
  loadDraft(): { title: string; code: string } | null {
    try {
      const raw = localStorage.getItem(DRAFT);
      return raw ? (JSON.parse(raw) as { title: string; code: string }) : null;
    } catch {
      return null;
    }
  },
  saveDraft(title: string, code: string) {
    localStorage.setItem(DRAFT, JSON.stringify({ title, code }));
  },
  clearDraft() {
    localStorage.removeItem(DRAFT);
  },
};
