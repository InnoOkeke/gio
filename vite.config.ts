import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const PYODIDE_VERSION = '314.0.8';
const PYODIDE_DIR = `py/pyodide-${PYODIDE_VERSION}`;
const PYODIDE_FILES = ['pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide.mjs', 'pyodide.js', 'python_stdlib.zip', 'pyodide-lock.json'];
/** The API Gateway HTTP API response limit in the reference deployment; every Python file must stay under it. */
const MAX_PY_FILE_BYTES = 10_000_000;
const MIME: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

/**
 * Serves the self-hosted Pyodide files (real Python in the browser) at /py/pyodide-<version>/ in development
 * and copies them into dist/ui at build time. They are never fetched from a CDN.
 */
function pyodideFiles(): Plugin {
  const source = path.join(here, 'node_modules', 'pyodide');
  return {
    name: 'gio-pyodide-files',
    configureServer(server) {
      server.middlewares.use(`/${PYODIDE_DIR}/`, (req, res, next) => {
        const name = decodeURIComponent((req.url ?? '').split('?')[0] ?? '').replace(/^\/+/, '');
        if (!PYODIDE_FILES.includes(name)) return next();
        res.setHeader('Content-Type', MIME[path.extname(name)] ?? 'application/octet-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        fs.createReadStream(path.join(source, name)).pipe(res);
      });
      server.middlewares.use('/py/runner.html', (_req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        next();
      });
    },
    writeBundle(options) {
      const outDir = options.dir ?? path.join(here, 'dist', 'ui');
      const target = path.join(outDir, PYODIDE_DIR);
      fs.mkdirSync(target, { recursive: true });
      for (const name of PYODIDE_FILES) {
        const from = path.join(source, name);
        const size = fs.statSync(from).size;
        if (size > MAX_PY_FILE_BYTES) throw new Error(`${name} is ${size} bytes, over the ${MAX_PY_FILE_BYTES} byte limit for one Python file`);
        fs.copyFileSync(from, path.join(target, name));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pyodideFiles()],
  root: 'src/ui',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/ui',
    emptyOutDir: true,
    // The Python frame has an opaque origin and may only load from /py/, so the shared polyfill chunk must not exist.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        main: path.join(here, 'src/ui/index.html'),
        runner: path.join(here, 'src/ui/py/runner.html'),
      },
      output: {
        // The Python frame has an opaque origin, so everything it loads must come from /py/ (which is sent with CORS headers).
        entryFileNames: (chunk) => (chunk.name === 'runner' ? 'py/[name]-[hash].js' : 'assets/[name]-[hash].js'),
      },
    },
  },
  // The Python worker is a classic worker built from a blob, so it can use importScripts.
  worker: { format: 'iife' },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
