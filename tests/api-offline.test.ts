import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A small in-memory localStorage; `failWrites` makes every write throw like a full phone. */
function memoryStorage() {
  const data = new Map<string, string>();
  const store = {
    data,
    failWrites: false,
    getItem: (k: string) => data.get(k) ?? null,
    setItem(k: string, v: string) {
      if (store.failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      data.set(k, v);
    },
    removeItem(k: string) {
      if (store.failWrites) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      data.delete(k);
    },
  };
  return store;
}

const ok = (data: unknown) => new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });

/** api.ts keeps a "phone is full" flag, so every test gets a fresh copy of the module. */
async function load() {
  vi.resetModules();
  return import('../src/ui/api');
}

let storage: ReturnType<typeof memoryStorage>;
beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('navigator', { onLine: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('offline requests', () => {
  it('says the friendly offline sentence without calling fetch when the browser is offline', async () => {
    const { api, OfflineError, OFFLINE_MESSAGE } = await load();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', { onLine: false });
    const err = await api.explain('FD 10', 'code').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OfflineError);
    expect((err as Error).message).toBe(OFFLINE_MESSAGE);
    expect(OFFLINE_MESSAGE).toBe('Gio needs the internet for this one. Drawing and quests still work, and your code is safe on this phone.');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('works when there is no navigator at all', async () => {
    const { api, isOffline } = await load();
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ok({ text: 'hi' })));
    expect(isOffline()).toBe(false);
    await expect(api.explain('FD 10', 'code')).resolves.toEqual({ text: 'hi' });
  });

  it('turns a failed fetch (patchy data) into the same offline error', async () => {
    const { api, OfflineError, OFFLINE_MESSAGE } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const err = await api.askTurtle('a star', undefined, 'code').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OfflineError);
    expect((err as InstanceType<typeof OfflineError>).reason).toBe('offline');
    expect((err as Error).message).toBe(OFFLINE_MESSAGE);
  });

  it('gives the "taking too long" sentence when the request is aborted', async () => {
    const { api, OfflineError, SLOW_MESSAGE } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))));
    const err = await api.hint(1, 'FD 10', 'code').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OfflineError);
    expect((err as Error).message).toBe(SLOW_MESSAGE);
    expect(SLOW_MESSAGE).toBe('Gio is taking too long. Check your connection and try again.');
  });

  it('aborts a request that is still open after 35 seconds', async () => {
    vi.useFakeTimers();
    const { api, REQUEST_TIMEOUT_MS, SLOW_MESSAGE } = await load();
    expect(REQUEST_TIMEOUT_MS).toBe(35_000);
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
          }),
      ),
    );
    const pending = api.getProject('abc').catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS - 1);
    let settled = false;
    void pending.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(((await pending) as Error).message).toBe(SLOW_MESSAGE);
  });

  it('keeps ApiError for answers from GIO, including the friendly redirect', async () => {
    const { api, ApiError, OfflineError } = await load();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, error: "Let's draw something else!", code: 'redirect' }), { status: 400 })));
    const err = await api.askTurtle('x', undefined, 'code').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).not.toBeInstanceOf(OfflineError);
    expect((err as InstanceType<typeof ApiError>).redirect).toBe(true);
    expect((err as Error).message).toBe("Let's draw something else!");
    vi.stubGlobal('fetch', vi.fn(async () => new Response('busy', { status: 429 })));
    expect(((await api.getProject('abc').catch((e: unknown) => e)) as Error).message).toBe('Too many tries. Please wait a moment.');
  });
});

describe('a full phone', () => {
  it('saveDraft, clearDraft and rememberEditKey return false instead of throwing, and the flag is raised once', async () => {
    const { local, storageFull, onStorageFull } = await load();
    let told = 0;
    onStorageFull(() => (told += 1));
    expect(local.saveDraft('t', 'FD 10')).toBe(true);
    expect(storageFull()).toBe(false);
    storage.failWrites = true;
    expect(local.saveDraft('t', 'FD 20')).toBe(false);
    expect(local.rememberEditKey('abc', 'key')).toBe(false);
    expect(local.clearDraft()).toBe(false);
    expect(storageFull()).toBe(true);
    expect(told).toBe(1);
    expect(local.loadDraft()).toEqual({ title: 't', code: 'FD 10' });
  });
});

describe('unsaved edits of saved drawings', () => {
  it('keeps one entry per drawing and gives it back', async () => {
    const { local, UNSAVED } = await load();
    expect(local.loadUnsaved('abc')).toBeNull();
    local.saveUnsaved('abc', 'Star', 'FD 10');
    local.saveUnsaved('abc', 'Star', 'FD 20');
    expect(local.loadUnsaved('abc')).toEqual({ title: 'Star', code: 'FD 20' });
    expect(JSON.parse(storage.data.get(UNSAVED)!)).toHaveLength(1);
  });

  it('never drops an older edit to make room: past the limit the phone is reported full', async () => {
    const { local, MAX_UNSAVED, UNSAVED, storageFull } = await load();
    expect(MAX_UNSAVED).toBe(50);
    for (let i = 0; i < MAX_UNSAVED; i++) expect(local.saveUnsaved('s' + i, 't', 'FD ' + i)).toBe(true);
    expect(local.saveUnsaved('extra', 't', 'FD 1')).toBe(false);
    expect(storageFull()).toBe(true);
    expect(local.loadUnsaved('s0')).toEqual({ title: 't', code: 'FD 0' });
    expect(local.loadUnsaved('extra')).toBeNull();
    // Editing a drawing that is already kept still works at the limit.
    expect(local.saveUnsaved('s0', 't', 'FD 99')).toBe(true);
    expect(JSON.parse(storage.data.get(UNSAVED)!)).toHaveLength(MAX_UNSAVED);
  });
  it('clears one drawing after a save and removes the key when none are left', async () => {
    const { local, UNSAVED } = await load();
    local.saveUnsaved('abc', 'Star', 'FD 10');
    local.saveUnsaved('xyz', 'Sun', 'FD 20');
    expect(local.clearUnsaved('abc')).toBe(true);
    expect(local.loadUnsaved('abc')).toBeNull();
    expect(local.loadUnsaved('xyz')).toEqual({ title: 'Sun', code: 'FD 20' });
    local.clearUnsaved('xyz');
    expect(storage.data.has(UNSAVED)).toBe(false);
    expect(local.clearUnsaved('never')).toBe(true);
  });

  it('ignores junk in storage and survives a full phone', async () => {
    const { local, UNSAVED, storageFull } = await load();
    storage.data.set(UNSAVED, '{"oops":1}');
    expect(local.loadUnsaved('abc')).toBeNull();
    storage.data.set(UNSAVED, JSON.stringify([{ slug: 'abc', title: 'ok', code: 'FD 1' }, { slug: 5 }, null]));
    expect(local.loadUnsaved('abc')).toEqual({ title: 'ok', code: 'FD 1' });
    storage.failWrites = true;
    expect(local.saveUnsaved('abc', 'x', 'FD 2')).toBe(false);
    expect(storageFull()).toBe(true);
  });
});
