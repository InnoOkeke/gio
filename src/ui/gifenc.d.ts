declare module 'gifenc' {
  export type Palette = number[][];
  export interface WriteFrameOptions {
    palette?: Palette;
    /** Frame delay in milliseconds. */
    delay?: number;
    /** -1 plays once, 0 loops forever, a positive number repeats that many times. */
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  }
  export interface GifEncoderInstance {
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    reset(): void;
  }
  export function GIFEncoder(opts?: { auto?: boolean; initialCapacity?: number }): GifEncoderInstance;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: { format?: 'rgb565' | 'rgb444' | 'rgba4444'; oneBitAlpha?: boolean | number; clearAlpha?: boolean },
  ): Palette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: Palette,
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;
}
