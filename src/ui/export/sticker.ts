/**
 * WhatsApp stickers: a drawing becomes a 512x512 picture with a transparent background, a white
 * outline and a file size of 100 KB or less (WebP where the browser can make one).
 * The pixel work is plain array code so it can be tested without a browser.
 */
import type { TurtleEvent } from '../../logo/index.js';
import { paintFill } from '../runtime/paint';
import { WORLD_HALF } from '../runtime/player';
export const STICKER_SIZE = 512;
/** WhatsApp's limit for a static sticker. */
export const STICKER_MAX_BYTES = 100 * 1024;
/** WhatsApp recommends a white stroke of about 8 px, so the sticker shows on dark and coloured chats. */
export const OUTLINE_PX = 10;
/** Transparent space kept around the outline. */
const EDGE_PX = 6;
/** The drawing itself fits in this square, in the middle of the sticker. */
export const ART_BOX = STICKER_SIZE - 2 * (OUTLINE_PX + EDGE_PX);
/** A tiny drawing is never blown up past this many sticker pixels per turtle step. */
const MAX_PIXELS_PER_STEP = 4;
/** The first pass finds the edges of the drawing at this many pixels per turtle step. */
const MEASURE_PIXELS_PER_STEP = 2;
/** Pixels fainter than this count as empty when looking for the edges of the drawing. */
const VISIBLE_ALPHA = 8;
/** WebP qualities tried in order, best first, until the file is small enough. */
export const WEBP_QUALITIES: readonly number[] = [0.92, 0.8, 0.65, 0.5, 0.35, 0.2];
/** PNG fallback: how many levels each colour channel keeps, most first. */
export const PNG_LEVELS: readonly number[] = [256, 64, 32, 16, 8];

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The smallest box that holds every visible pixel, or null when nothing is drawn. */
export function alphaBounds(data: Uint8ClampedArray, width: number, height: number): Bounds | null {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > VISIBLE_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** How many sticker pixels one turtle step gets, so the drawing fills the art box (never past MAX_PIXELS_PER_STEP). */
export function fitScale(worldWidth: number, worldHeight: number): number {
  return Math.min(ART_BOX / Math.max(worldWidth, 1e-6), ART_BOX / Math.max(worldHeight, 1e-6), MAX_PIXELS_PER_STEP);
}
/** Row widths of a disc: for each step away from the centre, how far it reaches sideways. */
function discReach(radius: number): number[] {
  const reach: number[] = [];
  for (let dy = 0; dy <= radius; dy++) reach.push(Math.floor(Math.sqrt(radius * radius - dy * dy) + 0.5));
  return reach;
}

/**
 * Put the drawing on white "sticker paper": a white outline around every line, and white inside
 * closed shapes too, so lines stay readable on a dark chat. Everything else stays transparent.
 * `art` is straight (not premultiplied) RGBA, STICKER_SIZE wide and high. It is changed in place.
 */
export function addStickerOutline(art: Uint8ClampedArray, size: number = STICKER_SIZE, radius: number = OUTLINE_PX): void {
  const count = size * size;
  const grown = new Uint8Array(count);
  const reach = discReach(radius);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (art[(y * size + x) * 4 + 3]! <= VISIBLE_ALPHA) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= size) continue;
        const r = reach[Math.abs(dy)]!;
        const from = Math.max(0, x - r);
        const to = Math.min(size - 1, x + r);
        grown.fill(1, yy * size + from, yy * size + to + 1);
      }
    }
  }
  // Whatever the outside cannot reach is inside a closed shape: that is paper too.
  const outside = new Uint8Array(count);
  const stack: number[] = [];
  const visit = (i: number) => {
    if (grown[i] === 0 && outside[i] === 0) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let i = 0; i < size; i++) {
    visit(i);
    visit((size - 1) * size + i);
    visit(i * size);
    visit(i * size + size - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % size;
    if (x > 0) visit(i - 1);
    if (x < size - 1) visit(i + 1);
    if (i >= size) visit(i - size);
    if (i < count - size) visit(i + size);
  }
  // A 3x3 average softens the staircase on the outer edge of the paper.
  const paper = new Float32Array(count);
  for (let i = 0; i < count; i++) paper[i] = outside[i] === 1 ? 0 : 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      if (paper[i] === 0 && grown[i] === 0) continue;
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < size && yy >= 0 && yy < size) sum += outside[yy * size + xx] === 1 ? 0 : 1;
        }
      }
      paper[i] = sum / 9;
    }
  }
  for (let i = 0; i < count; i++) {
    const p = paper[i]!;
    if (p === 0) continue;
    const o = i * 4;
    const a = art[o + 3]! / 255;
    const outA = a + p * (1 - a);
    if (outA <= 0) continue;
    const behind = 255 * p * (1 - a);
    art[o] = Math.round((art[o]! * a + behind) / outA);
    art[o + 1] = Math.round((art[o + 1]! * a + behind) / outA);
    art[o + 2] = Math.round((art[o + 2]! * a + behind) / outA);
    art[o + 3] = Math.round(outA * 255);
  }
}

/** Keep fewer shades per colour channel (the transparency is left alone), so a PNG compresses better. */
export function posterize(data: Uint8ClampedArray, levels: number): Uint8ClampedArray {
  if (levels >= 256) return data;
  const step = 255 / (levels - 1);
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = Math.round(Math.round(data[i]! / step) * step);
    out[i + 1] = Math.round(Math.round(data[i + 1]! / step) * step);
    out[i + 2] = Math.round(Math.round(data[i + 2]! / step) * step);
    out[i + 3] = data[i + 3]!;
  }
  return out;
}

export interface ImageFacts {
  /** The file's real format: "webp", "png" or null when it is neither. */
  format: 'webp' | 'png' | null;
  width: number;
  height: number;
  bytes: number;
}

const u16 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8);
const u24 = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));

/** Read the format and size from the file itself (WebP lossy, lossless and extended, or PNG). */
export function readImageFacts(bytes: Uint8Array): ImageFacts {
  const none: ImageFacts = { format: null, width: 0, height: 0, bytes: bytes.length };
  if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG') {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { format: 'png', width: dv.getUint32(16), height: dv.getUint32(20), bytes: bytes.length };
  }
  if (bytes.length < 30 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return none;
  const kind = ascii(bytes, 12, 4);
  if (kind === 'VP8X') return { format: 'webp', width: u24(bytes, 24) + 1, height: u24(bytes, 27) + 1, bytes: bytes.length };
  if (kind === 'VP8L') {
    const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, bytes: bytes.length };
  }
  if (kind === 'VP8 ') return { format: 'webp', width: u16(bytes, 26) & 0x3fff, height: u16(bytes, 28) & 0x3fff, bytes: bytes.length };
  return none;
}

/** Everything WhatsApp would refuse about a sticker, in plain words. An empty list means it is fine. */
export function stickerProblems(facts: ImageFacts, cornersTransparent: boolean): string[] {
  const problems: string[] = [];
  if (facts.format === null) problems.push('not a WebP or PNG file');
  if (facts.width !== STICKER_SIZE || facts.height !== STICKER_SIZE) problems.push(`${facts.width}x${facts.height} instead of ${STICKER_SIZE}x${STICKER_SIZE}`);
  if (facts.bytes > STICKER_MAX_BYTES) problems.push(`${facts.bytes} bytes is over the ${STICKER_MAX_BYTES} byte limit`);
  if (!cornersTransparent) problems.push('the background is not transparent');
  return problems;
}

export interface Sticker {
  blob: Blob;
  /** "webp" where the browser can make WebP, otherwise "png" (Safari on iPhone and iPad cannot make WebP). */
  extension: 'webp' | 'png';
  width: number;
  height: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Draw the events the way the stage does (lines, dots, fills, clear), scale pixels per turtle step,
 * with turtle position (0, 0) at pixel (originX, originY).
 */
function paintEvents(ctx: CanvasRenderingContext2D, events: readonly TurtleEvent[], scale: number, originX: number, originY: number): void {
  const canvas = ctx.canvas;
  const toWorld = () => ctx.setTransform(scale, 0, 0, -scale, originX, originY);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  events.forEach((e, k) => {
    if (e.type === 'clear') {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    } else if (e.type === 'line') {
      toWorld();
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.lineTo(e.x2, e.y2);
      ctx.stroke();
    } else if (e.type === 'dot') {
      toWorld();
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'fill') {
      paintFill(ctx, events, k, toWorld);
    }
  });
}

/**
 * Turn a drawing into a sticker. It is drawn again from its events (not copied from the screen), so even a small
 * drawing is sharp. Returns null when nothing is drawn. Throws a plain Error when no file small enough can be made.
 */
export async function makeSticker(events: readonly TurtleEvent[]): Promise<Sticker | null> {
  // Pass 1: find the edges of the drawing, in turtle steps.
  const measure = document.createElement('canvas');
  measure.width = WORLD_HALF * 2 * MEASURE_PIXELS_PER_STEP;
  measure.height = measure.width;
  const mctx = measure.getContext('2d', { willReadFrequently: true });
  if (!mctx) throw new Error('This browser cannot make pictures.');
  paintEvents(mctx, events, MEASURE_PIXELS_PER_STEP, measure.width / 2, measure.height / 2);
  const bounds = alphaBounds(mctx.getImageData(0, 0, measure.width, measure.height).data, measure.width, measure.height);
  if (!bounds) return null;
  const left = bounds.x / MEASURE_PIXELS_PER_STEP - WORLD_HALF;
  const top = WORLD_HALF - bounds.y / MEASURE_PIXELS_PER_STEP;
  const width = bounds.width / MEASURE_PIXELS_PER_STEP;
  const height = bounds.height / MEASURE_PIXELS_PER_STEP;
  const scale = fitScale(width, height);
  // Pass 2: draw it again, centred and as big as the art box allows.
  const canvas = document.createElement('canvas');
  canvas.width = STICKER_SIZE;
  canvas.height = STICKER_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('This browser cannot make pictures.');
  paintEvents(ctx, events, scale, STICKER_SIZE / 2 - (left + width / 2) * scale, STICKER_SIZE / 2 + (top - height / 2) * scale);
  const pixels = ctx.getImageData(0, 0, STICKER_SIZE, STICKER_SIZE);
  addStickerOutline(pixels.data);
  ctx.putImageData(pixels, 0, 0);
  for (const quality of WEBP_QUALITIES) {
    const blob = await toBlob(canvas, 'image/webp', quality);
    // A browser that cannot make WebP quietly hands back a PNG. Stop asking it for WebP.
    if (!blob || blob.type !== 'image/webp') break;
    if (blob.size <= STICKER_MAX_BYTES) return { blob, extension: 'webp', width: STICKER_SIZE, height: STICKER_SIZE };
  }
  // WhatsApp on iPhone also takes PNG. Fewer shades make the file smaller.
  for (const levels of PNG_LEVELS) {
    if (levels < 256) ctx.putImageData(new ImageData(posterize(pixels.data, levels), STICKER_SIZE, STICKER_SIZE), 0, 0);
    const blob = await toBlob(canvas, 'image/png');
    if (blob && blob.size <= STICKER_MAX_BYTES) return { blob, extension: 'png', width: STICKER_SIZE, height: STICKER_SIZE };
  }
  throw new Error('The sticker is too detailed to send.');
}