import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const manifest = JSON.parse(fs.readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8')) as {
  id: string;
  name: string;
  short_name: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string; purpose: string }[];
};

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(1, 4).toString('ascii'), `${file} is a PNG`).toBe('PNG');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('web app manifest', () => {
  it('has the installable fields', () => {
    expect(manifest.name).toBe('GIO');
    expect(manifest.short_name).toBe('GIO');
    expect(manifest.id).toBe('/');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('any');
    expect(manifest.theme_color).toBe('#0c9a6a');
  });

  it('declares 192 and 512 icons including a maskable one', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '192x192')).toBe(true);
    expect(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
    expect(manifest.icons.some((i) => i.purpose === 'any')).toBe(true);
  });

  it('declares icon sizes that equal the real PNG pixel sizes', () => {
    for (const icon of manifest.icons) {
      const [w, h] = icon.sizes.split('x').map(Number);
      expect(pngSize(path.join(publicDir, icon.src)), icon.src).toEqual({ width: w, height: h });
    }
  });

  it('has the favicon and apple touch icon at the sizes index.html uses', () => {
    expect(pngSize(path.join(publicDir, 'icons', 'favicon-32.png'))).toEqual({ width: 32, height: 32 });
    expect(pngSize(path.join(publicDir, 'icons', 'apple-touch-180.png'))).toEqual({ width: 180, height: 180 });
  });
});
