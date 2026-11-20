/**
 * Builds the service worker's precache list from the files Vite wrote. Pure: files and a reader go in, a list and a
 * build id come out, so tests can check it without a build.
 */
import { createHash } from 'crypto';
import type { ManifestEntry } from '../../src/ui/offline/cache-rules';

export interface BuiltManifest {
  entries: ManifestEntry[];
  buildId: string;
}

type Reader = (relativePath: string) => Buffer | string;

const sha256 = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex');

/** The Nunito latin files only: other writing systems are fetched the first time they are needed. */
const isLatinFont = (file: string): boolean => /\/[^/]*-latin-(?!ext)[^/]*\.woff2$/.test(file);

/**
 * bundleFiles and publicFiles are paths relative to the output folder, with forward slashes.
 * Hashed files (assets/*, py/runner-*.js) get rev null because their URL changes with their content.
 * Everything else gets a content hash. Pyodide is never listed: it is large and is kept only after the child opts in.
 */
export function buildManifest(bundleFiles: readonly string[], publicFiles: readonly string[], readFile: Reader): BuiltManifest {
  const byUrl = new Map<string, ManifestEntry>();
  const add = (url: string, rev: string | null): void => {
    byUrl.set(url, { url, rev });
  };
  const files = [...bundleFiles].sort();
  const cssFiles = files.filter((f) => /^assets\/[^/]+\.css$/.test(f));
  const cssText = cssFiles.map((f) => readFile(f).toString()).join('\n');

  for (const file of files) {
    if (file.startsWith('py/pyodide-') || file === 'sw.js') continue;
    if (file === 'index.html') add('/', sha256(readFile(file)));
    else if (/^assets\/[^/]+\.(js|css)$/.test(file)) add(`/${file}`, null);
    else if (/^assets\/[^/]+\.woff2$/.test(file)) {
      const name = file.slice(file.lastIndexOf('/') + 1);
      if (isLatinFont(`/${file}`) && cssText.includes(name)) add(`/${file}`, null);
    } else if (file === 'py/runner.html') add(`/${file}`, sha256(readFile(file)));
    else if (/^py\/runner-[^/]+\.js$/.test(file)) add(`/${file}`, null);
  }
  for (const file of [...publicFiles].sort()) {
    if (file.startsWith('py/pyodide-') || file === 'sw.js') continue;
    add(`/${file}`, sha256(readFile(file)));
  }

  const entries = [...byUrl.values()].sort((a, b) => (a.url < b.url ? -1 : 1));
  const buildId = sha256(entries.map((e) => `${e.url}@${e.rev ?? ''}`).join('\n')).slice(0, 12);
  return { entries, buildId };
}
