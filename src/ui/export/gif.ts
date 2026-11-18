export interface GifFrame {
  /** RGBA pixels, size by size. */
  data: Uint8ClampedArray;
  /** How long the picture stays on screen, in milliseconds. */
  delay: number;
}

/** Each movie picture stays this long. */
export const FRAME_DELAY_MS = 80;
/** The finished drawing stays longer before the movie loops. */
export const HOLD_LAST_MS = 1800;
const PALETTE_COLORS = 128;

function abortError(): DOMException {
  return new DOMException('The movie was cancelled.', 'AbortError');
}

export interface GifHooks {
  signal?: AbortSignal;
  /** Called after each picture is encoded, with how many are done. */
  onFrame?(done: number): Promise<void> | void;
}

/**
 * Encode pictures into a looping GIF. One palette made from the last picture is used for all of
 * them, so colours do not flicker from one picture to the next.
 */
export async function encodeGifBytes(frames: readonly GifFrame[], size: number, hooks: GifHooks = {}): Promise<Uint8Array> {
  const last = frames[frames.length - 1];
  if (!last) throw new Error('There is nothing to put in the movie.');
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
  const palette = quantize(last.data, PALETTE_COLORS);
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    if (hooks.signal?.aborted) throw abortError();
    const frame = frames[i]!;
    const index = applyPalette(frame.data, palette);
    gif.writeFrame(index, size, size, i === 0 ? { palette, delay: frame.delay, repeat: 0 } : { delay: frame.delay });
    await hooks.onFrame?.(i + 1);
  }
  gif.finish();
  return gif.bytes();
}

export interface EncodeGifOptions {
  frames: AsyncIterable<ImageData>;
  /** How many pictures the iterable will give, so progress can be shown. */
  total: number;
  size: number;
  signal?: AbortSignal;
  /** A number from 0 to 1. */
  onProgress?(fraction: number): void;
}

/** Collect the pictures, then encode them. Rendering is the first 80% of the progress, encoding the rest. */
export async function encodeGif({ frames, total, size, signal, onProgress }: EncodeGifOptions): Promise<Blob> {
  const collected: GifFrame[] = [];
  for await (const image of frames) {
    if (signal?.aborted) throw abortError();
    collected.push({ data: image.data, delay: FRAME_DELAY_MS });
    onProgress?.((collected.length / total) * 0.8);
  }
  if (signal?.aborted) throw abortError();
  const last = collected[collected.length - 1];
  if (last) last.delay = HOLD_LAST_MS;
  const bytes = await encodeGifBytes(collected, size, {
    signal,
    onFrame: async (done) => {
      onProgress?.(0.8 + (done / collected.length) * 0.2);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    },
  });
  return new Blob([bytes], { type: 'image/gif' });
}
