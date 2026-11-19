/**
 * Runs inside <iframe sandbox="allow-scripts" src="/py/runner.html">. The frame has an opaque origin: it cannot read
 * GIO's storage or cookies. It starts the Python worker (from a blob) and passes messages between the page and
 * the worker. It only accepts messages from the page that holds it, and only a few known kinds.
 */
import PythonWorker from './worker?worker&inline';

const PYODIDE_BASE = '/py/pyodide-314.0.8/';
const HOST_TYPES = ['run', 'press', 'fire', 'stop'];

let worker: Worker | null = null;

function toHost(message: unknown): void {
  window.parent.postMessage(message, '*');
}

function startWorker(): void {
  worker?.terminate();
  const next = new PythonWorker();
  worker = next;
  next.onmessage = (event: MessageEvent) => {
    if (worker !== next) return;
    const data = event.data as { type?: string };
    if (data && (data.type === 'ready' || data.type === 'failed' || data.type === 'result')) toHost(data);
  };
  next.onerror = () => {
    if (worker === next) toHost({ type: 'failed', message: 'The Python worker stopped.' });
  };
  // The frame's own origin is opaque, so work out where GIO's server is from the address the frame was loaded from.
  next.postMessage({ type: 'init', base: new URL(PYODIDE_BASE, document.baseURI).href });
}

window.addEventListener('message', (event: MessageEvent) => {
  if (event.source !== window.parent) return;
  const data = event.data as { type?: string; id?: unknown; code?: unknown; key?: unknown; timer?: unknown } | null;
  if (!data || typeof data.type !== 'string' || !HOST_TYPES.includes(data.type)) return;
  if (data.type === 'stop') {
    startWorker();
    return;
  }
  worker?.postMessage(data);
});

startWorker();
