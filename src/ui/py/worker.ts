/**
 * The Python worker, started from a blob inside the sandboxed frame. It loads GIO's own copy of Pyodide, installs
 * GIO's turtle, then takes the network away from Python before any child's code runs.
 */
import bootSource from '../runtime/python/boot.py?raw';
import turtleSource from '../runtime/python/turtle.py?raw';
import winsoundSource from '../runtime/python/winsound.py?raw';
import { installShim, type PyodideLike, type PythonCalls } from '../python/shim.js';

declare const loadPyodide: (options: { indexURL: string }) => Promise<PyodideLike>;
const scope = self as unknown as Record<string, unknown> & { postMessage(message: unknown): void };

let calls: PythonCalls | null = null;

/** After Pyodide has loaded, nothing in the worker can reach the network or load more scripts. */
function takeAwayTheNetwork(): void {
  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'EventSource', 'WebTransport', 'Worker', 'SharedWorker']) {
    try {
      Object.defineProperty(self, name, { value: undefined, writable: false, configurable: false });
    } catch {
      /* already locked */
    }
  }
}

async function start(base: string): Promise<void> {
  const importer = scope['importScripts'] as ((url: string) => void) | undefined;
  if (typeof importer === 'function') {
    importer(`${base}pyodide.js`);
  } else {
    // A module worker (only the dev server makes one) has no importScripts.
    const module = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as { loadPyodide: typeof loadPyodide };
    (scope as Record<string, unknown>)['loadPyodide'] = module.loadPyodide;
  }
  const py = await loadPyodide({ indexURL: base });
  calls = installShim(py, { turtle: turtleSource, winsound: winsoundSource, boot: bootSource });
  takeAwayTheNetwork();
}

function answer(id: number, text: string): void {
  const parsed = JSON.parse(text) as Record<string, unknown>;
  scope.postMessage({ type: 'result', id, events: parsed['events'], error: parsed['error'], ready: parsed['ready'] });
}

self.onmessage = (event: MessageEvent) => {
  const data = event.data as { type?: string; id?: number; base?: string; code?: string; key?: string; timer?: number };
  const id = typeof data.id === 'number' ? data.id : 0;
  if (data.type === 'init' && typeof data.base === 'string') {
    start(data.base).then(
      () => scope.postMessage({ type: 'ready' }),
      (error: unknown) => scope.postMessage({ type: 'failed', message: error instanceof Error ? error.message : String(error) }),
    );
    return;
  }
  if (!calls) return;
  try {
    if (data.type === 'run' && typeof data.code === 'string') answer(id, calls.run(data.code));
    else if (data.type === 'press' && typeof data.key === 'string') answer(id, calls.press(data.key));
    else if (data.type === 'fire' && typeof data.timer === 'number') answer(id, calls.fire(data.timer));
  } catch (error) {
    // Python itself failed (not the child's code, which reports through the result).
    scope.postMessage({ type: 'result', id, events: [], error: { message: error instanceof Error ? error.message : String(error), line: 0 }, ready: { keys: [], ticks: [] } });
  }
};
