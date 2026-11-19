/**
 * Installs GIO's Python files (turtle.py, winsound.py, boot.py) into a loaded Pyodide. The worker and the Node tests
 * both use this, with the same file text, so what the tests prove is what the browser runs.
 */
import { NAMED_COLORS } from '../../logo/colors.js';

/** The slice of Pyodide that the shim needs. */
export interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): unknown; set(name: string, value: unknown): void };
  toPy(value: unknown): unknown;
}

export interface ShimSources {
  turtle: string;
  winsound: string;
  boot: string;
}

/** What Python hands back from one call, still as text. */
export interface PythonCalls {
  run(code: string): string;
  press(key: string): string;
  fire(timer: number): string;
}

/** GIO's colour names in lower case, so Python and Logo share one table. */
export function colorTable(): Record<string, string> {
  const table: Record<string, string> = {};
  for (const [name, hex] of Object.entries(NAMED_COLORS)) table[name.toLowerCase()] = hex;
  return table;
}

export function installShim(py: PyodideLike, sources: ShimSources): PythonCalls {
  py.globals.set('SOURCES', py.toPy({ turtle: sources.turtle, winsound: sources.winsound }));
  py.globals.set('COLORS_JSON', JSON.stringify(colorTable()));
  py.runPython(sources.boot);
  const call = (name: string) => py.globals.get(name) as (...args: unknown[]) => string;
  const run = call('run');
  const press = call('press');
  const fire = call('fire');
  return {
    run: (code) => run(code),
    press: (key) => press(key),
    fire: (timer) => fire(timer),
  };
}
