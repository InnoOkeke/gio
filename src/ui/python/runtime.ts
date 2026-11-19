/**
 * The page's side of GIO's Python: creates the sandboxed frame, sends it programs and key presses, checks
 * everything that comes back, and keeps the game timers. Python itself never runs on the page.
 */
import { validateEvents, validateProblem, validateReady, RUNNER_PATH, type HostMessage, type PythonResult } from './protocol.js';

export const PYTHON_READY_KEY = 'gio.pythonReady';
/** A call that has not answered by now is stopped, like a Logo program that never ends. */
export const WATCHDOG_MS = 10_000;
/** While the stage still has this many events to play, a timer waits (the same rule as the Logo game clock). */
export const MAX_PENDING = 40;
export const TIMEOUT_MESSAGE = 'Your Python ran for 10 seconds, so I stopped it.';

export interface PythonRuntimeOptions {
  /** How many events the stage has not played yet. */
  pending?: () => number;
  /** Results that arrive on their own: a game timer firing. */
  onAsync?: (result: PythonResult) => void;
  /** Where the frame is added. Defaults to the page body. */
  parent?: HTMLElement;
}

interface Waiting {
  resolve(result: PythonResult): void;
  timer: number;
}

const EMPTY: PythonResult = { events: [], keys: [], ticks: [] };
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export class PythonRuntime {
  private frame: HTMLIFrameElement | null = null;
  private readyPromise: Promise<void> | null = null;
  private settleReady: { resolve(): void; reject(error: Error): void } | null = null;
  private nextId = 1;
  private waiting = new Map<number, Waiting>();
  private timers = new Map<number, number>();
  private scheduled = new Set<number>();
  /** Bumped when a run starts or Python stops, so timers from an older run never fire into a newer one. */
  private generation = 0;
  private disposed = false;
  private readonly onMessage = (event: MessageEvent) => this.receive(event);

  constructor(private readonly options: PythonRuntimeOptions = {}) {}

  /** Creates the frame (once) and waits until Python is loaded. Call this only after the child has said yes to the download. */
  ensureReady(): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Python was closed.'));
    if (this.readyPromise) return this.readyPromise;
    window.addEventListener('message', this.onMessage);
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.settleReady = { resolve, reject };
    });
    const frame = document.createElement('iframe');
    // The sandbox is the whole point: scripts may run, but the frame has no access to GIO's storage, cookies or pages.
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('title', 'Python engine (hidden)');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    frame.src = RUNNER_PATH;
    (this.options.parent ?? document.body).appendChild(frame);
    this.frame = frame;
    this.readyPromise.catch(() => {
      /* the caller sees the rejection; this keeps it from being reported twice */
    });
    return this.readyPromise;
  }

  isReady(): boolean {
    return this.readyPromise !== null && this.settleReady === null;
  }

  /** Runs a whole program. Resolves with its events, a plain-language problem if it had one, and the keys and timers it set up. */
  async run(code: string): Promise<PythonResult> {
    this.release();
    return this.call({ type: 'run', id: 0, code });
  }

  /** A game key. */
  async press(key: string): Promise<PythonResult> {
    return this.call({ type: 'press', id: 0, key });
  }

  /** True while a call is waiting for Python to answer. */
  busy(): boolean {
    return this.waiting.size > 0;
  }

  /** Forget game timers and keys without throwing the loaded Python away (a Logo run is starting, or the child pressed Reset). */
  release(): void {
    this.generation += 1;
    for (const t of this.timers.values()) window.clearTimeout(t);
    this.timers.clear();
    this.scheduled.clear();
  }

  /** Stops whatever Python is doing: the worker is thrown away and started again. */
  stop(): void {
    this.release();
    for (const [, w] of this.waiting) {
      window.clearTimeout(w.timer);
      w.resolve({ ...EMPTY });
    }
    this.waiting.clear();
    if (!this.frame) return;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.settleReady = { resolve, reject };
    });
    this.readyPromise.catch(() => undefined);
    this.send({ type: 'stop' });
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
    window.removeEventListener('message', this.onMessage);
    this.frame?.remove();
    this.frame = null;
    this.readyPromise = null;
    this.settleReady?.reject(new Error('Python was closed.'));
    this.settleReady = null;
  }

  private send(message: HostMessage): void {
    this.frame?.contentWindow?.postMessage(message, '*');
  }

  private async call(message: HostMessage): Promise<PythonResult> {
    await this.ensureReady();
    const id = this.nextId++;
    return new Promise<PythonResult>((resolve) => {
      const timer = window.setTimeout(() => {
        // Nothing answered in time: the worker is thrown away so a loop that never ends cannot freeze anything.
        this.waiting.delete(id);
        this.stop();
        resolve({ events: [], error: { message: TIMEOUT_MESSAGE, line: 0 }, keys: [], ticks: [] });
      }, WATCHDOG_MS);
      this.waiting.set(id, { resolve, timer });
      this.send({ ...message, id } as HostMessage);
    });
  }

  private receive(event: MessageEvent): void {
    // Only the frame this page made may talk to it. Everything else is ignored.
    if (!this.frame || event.source !== this.frame.contentWindow) return;
    const data = event.data as { type?: unknown; id?: unknown; events?: unknown; error?: unknown; ready?: unknown; message?: unknown } | null;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'ready') {
      try {
        localStorage.setItem(PYTHON_READY_KEY, '1');
      } catch {
        /* the browser would not remember; Python still works */
      }
      const settle = this.settleReady;
      this.settleReady = null;
      settle?.resolve();
    } else if (data.type === 'failed') {
      const settle = this.settleReady;
      this.settleReady = null;
      // Throw the frame away so tapping the button again starts clean.
      this.frame.remove();
      this.frame = null;
      this.readyPromise = null;
      settle?.reject(new Error(typeof data.message === 'string' ? data.message.slice(0, 200) : 'Python could not start.'));
    } else if (data.type === 'result' && typeof data.id === 'number') {
      const w = this.waiting.get(data.id);
      if (!w) return;
      this.waiting.delete(data.id);
      window.clearTimeout(w.timer);
      const ready = validateReady(data.ready);
      const problem = validateProblem(data.error);
      const result: PythonResult = { events: validateEvents(data.events).events, ...(problem ? { error: problem } : {}), keys: ready.keys, ticks: ready.ticks };
      this.scheduleTimers(result);
      w.resolve(result);
    }
  }

  /** Python asks for a timer with ontimer(); the page waits, then tells Python to run it. */
  private scheduleTimers(result: PythonResult): void {
    const generation = this.generation;
    for (const tick of result.ticks) {
      if (this.scheduled.has(tick.id)) continue;
      this.scheduled.add(tick.id);
      const handle = window.setTimeout(() => {
        this.timers.delete(tick.id);
        void this.fire(tick.id, generation);
      }, tick.ms);
      this.timers.set(tick.id, handle);
    }
  }

  private async fire(timer: number, generation: number): Promise<void> {
    // Hold while the stage is still catching up, like the Logo game clock does.
    while (this.options.pending && this.options.pending() > MAX_PENDING) {
      await sleep(50);
      if (generation !== this.generation) return;
    }
    if (generation !== this.generation || this.disposed) return;
    const result = await this.call({ type: 'fire', id: 0, timer });
    if (generation !== this.generation) return;
    this.options.onAsync?.(result);
  }
}
