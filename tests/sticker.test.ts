import { describe, expect, it } from 'vitest';
import {
  ART_BOX,
  OUTLINE_PX,
  STICKER_MAX_BYTES,
  STICKER_SIZE,
  addStickerOutline,
  alphaBounds,
  fitScale,
  posterize,
  readImageFacts,
  stickerProblems,
} from '../src/ui/export/sticker';

/** Real WebP files, 1 pixel each: lossless, lossy, and lossy with transparency (the VP8X form). */
const WEBP_LOSSLESS = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
const WEBP_LOSSY = 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
const WEBP_ALPHA = 'UklGRkoAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAwAAAARBxAR/Q9ERP8DAABWUDggGAAAABQBAJ0BKgEAAQAAAP4AAA3AAP7mtQAAAA==';

const bytes = (base64: string) => new Uint8Array(Buffer.from(base64, 'base64'));
const at = (x: number, y: number) => (y * STICKER_SIZE + x) * 4;

/** A transparent sticker-sized canvas with a black square outline (4 px lines) drawn in the middle. */
function squareArt(half: number): Uint8ClampedArray {
  const art = new Uint8ClampedArray(STICKER_SIZE * STICKER_SIZE * 4);
  const mid = STICKER_SIZE / 2;
  for (let y = mid - half; y <= mid + half; y++) {
    for (let x = mid - half; x <= mid + half; x++) {
      const onLine = Math.min(x - (mid - half), mid + half - x, y - (mid - half), mid + half - y) < 4;
      if (onLine) art.set([0, 0, 0, 255], at(x, y));
    }
  }
  return art;
}

describe('sticker size limits', () => {
  it('uses the limits WhatsApp states: 512x512 and 100 KB', () => {
    expect(STICKER_SIZE).toBe(512);
    expect(STICKER_MAX_BYTES).toBe(102_400);
  });

  it('reads the real size and format of WebP files', () => {
    expect(readImageFacts(bytes(WEBP_LOSSLESS))).toMatchObject({ format: 'webp', width: 1, height: 1 });
    expect(readImageFacts(bytes(WEBP_LOSSY))).toMatchObject({ format: 'webp', width: 1, height: 1 });
    expect(readImageFacts(bytes(WEBP_ALPHA))).toMatchObject({ format: 'webp', width: 1, height: 1 });
    expect(readImageFacts(new Uint8Array(40)).format).toBeNull();
  });

  it('accepts a 512x512 WebP under 100 KB with a transparent background', () => {
    expect(stickerProblems({ format: 'webp', width: 512, height: 512, bytes: 31_000 }, true)).toEqual([]);
    expect(stickerProblems({ format: 'webp', width: 512, height: 512, bytes: STICKER_MAX_BYTES }, true)).toEqual([]);
  });

  it('names every reason WhatsApp would refuse a sticker', () => {
    expect(stickerProblems({ format: 'webp', width: 512, height: 511, bytes: 1000 }, true)).toHaveLength(1);
    expect(stickerProblems({ format: 'webp', width: 512, height: 512, bytes: STICKER_MAX_BYTES + 1 }, true)).toHaveLength(1);
    expect(stickerProblems({ format: 'webp', width: 512, height: 512, bytes: 1000 }, false)).toEqual(['the background is not transparent']);
    expect(stickerProblems({ format: null, width: 0, height: 0, bytes: 10 }, false)).toHaveLength(3);
  });
});

describe('sticker picture', () => {
  it('finds the box around the drawing, and nothing in an empty canvas', () => {
    expect(alphaBounds(new Uint8ClampedArray(16 * 16 * 4), 16, 16)).toBeNull();
    const data = new Uint8ClampedArray(16 * 16 * 4);
    data[(3 * 16 + 5) * 4 + 3] = 255;
    data[(9 * 16 + 12) * 4 + 3] = 255;
    expect(alphaBounds(data, 16, 16)).toEqual({ x: 5, y: 3, width: 8, height: 7 });
  });

  it('sizes the drawing to fit the art box, leaving room for the outline', () => {
    for (const [w, h] of [[600, 450], [150, 350], [3, 3], [0, 0]] as const) {
      const k = fitScale(w, h);
      expect(w * k).toBeLessThanOrEqual(ART_BOX + 1e-6);
      expect(h * k).toBeLessThanOrEqual(ART_BOX + 1e-6);
      expect(k).toBeGreaterThan(0);
    }
    expect(ART_BOX + 2 * OUTLINE_PX).toBeLessThan(STICKER_SIZE);
    // A wide drawing is limited by its width, a tiny one by the enlargement cap.
    expect(fitScale(600, 100)).toBeCloseTo(ART_BOX / 600);
    expect(fitScale(10, 10)).toBe(4);
  });
  it('keeps the background transparent and adds a white outline', () => {
    const art = squareArt(ART_BOX / 2);
    addStickerOutline(art);
    expect(art.length).toBe(STICKER_SIZE * STICKER_SIZE * 4);
    // Corners and the whole outer border are see-through.
    for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511], [256, 0], [0, 256], [511, 256], [256, 511]] as const) {
      expect(art[at(x, y) + 3]).toBe(0);
    }
    // The line itself is untouched black.
    const mid = STICKER_SIZE / 2;
    const left = mid - ART_BOX / 2;
    expect(Array.from(art.slice(at(left + 1, mid), at(left + 1, mid) + 4))).toEqual([0, 0, 0, 255]);
    // Just outside the line (4 px away) is solid white.
    expect(Array.from(art.slice(at(left - 4, mid), at(left - 4, mid) + 4))).toEqual([255, 255, 255, 255]);
    // The inside of a closed shape is paper too, so the lines show on a dark chat.
    expect(Array.from(art.slice(at(mid, mid), at(mid, mid) + 4))).toEqual([255, 255, 255, 255]);
    // The outline stops before the edge of the picture.
    expect(art[at(left - OUTLINE_PX - 3, mid) + 3]).toBe(0);
  });

  it('does not fill a shape that is open to the outside', () => {
    const art = new Uint8ClampedArray(STICKER_SIZE * STICKER_SIZE * 4);
    // A "C": three sides of a square, a 60 px gap on the right.
    const mid = STICKER_SIZE / 2;
    for (let i = -100; i <= 100; i++) {
      for (let t = 0; t < 4; t++) {
        art.set([0, 0, 0, 255], at(mid + i, mid - 100 + t));
        art.set([0, 0, 0, 255], at(mid + i, mid + 100 - t));
        art.set([0, 0, 0, 255], at(mid - 100 + t, mid + i));
      }
    }
    addStickerOutline(art);
    // The middle of the C is far from every line and joins the outside through the gap, so it stays see-through.
    expect(art[at(mid, mid) + 3]).toBe(0);
    expect(art[at(0, 0) + 3]).toBe(0);
  });

  it('posterizes colours without touching transparency', () => {
    const data = new Uint8ClampedArray([13, 130, 250, 77, 0, 0, 0, 0]);
    const out = posterize(data, 8);
    expect(out[3]).toBe(77);
    expect(out[7]).toBe(0);
    expect(Array.from(out.slice(0, 3))).toEqual([0, 146, 255]);
    expect(posterize(data, 256)).toBe(data);
  });
});
