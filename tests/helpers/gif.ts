export interface GifInfo {
  signature: string;
  width: number;
  height: number;
  /** Number of image blocks. */
  frames: number;
  /** Delay of each frame in milliseconds, from the graphic control extensions. */
  delays: number[];
  /** The NETSCAPE2.0 loop count (0 = forever), or null when the file has no loop extension. */
  loop: number | null;
  /** True when the last byte is the 0x3B trailer and the walker ended exactly there. */
  endsWithTrailer: boolean;
}

/** Skip a chain of data sub-blocks and return the offset after the 0 terminator. */
function skipSubBlocks(bytes: Uint8Array, at: number): number {
  let i = at;
  for (;;) {
    const size = bytes[i];
    if (size === undefined) throw new Error('GIF ended inside a data block');
    i += 1 + size;
    if (size === 0) return i;
  }
}

/** Walk every block of a GIF file and report what is in it. Throws when the structure is broken. */
export function readGif(bytes: Uint8Array): GifInfo {
  const signature = String.fromCharCode(...bytes.slice(0, 6));
  if (signature !== 'GIF89a' && signature !== 'GIF87a') throw new Error(`Not a GIF: ${signature}`);
  const width = bytes[6]! | (bytes[7]! << 8);
  const height = bytes[8]! | (bytes[9]! << 8);
  const flags = bytes[10]!;
  let i = 13;
  if (flags & 0x80) i += 3 * (1 << ((flags & 7) + 1));

  const delays: number[] = [];
  let frames = 0;
  let loop: number | null = null;
  let endsWithTrailer = false;
  while (i < bytes.length) {
    const marker = bytes[i]!;
    if (marker === 0x3b) {
      endsWithTrailer = i === bytes.length - 1;
      break;
    }
    if (marker === 0x21) {
      const label = bytes[i + 1]!;
      if (label === 0xf9) delays.push((bytes[i + 4]! | (bytes[i + 5]! << 8)) * 10);
      if (label === 0xff) {
        const name = String.fromCharCode(...bytes.slice(i + 3, i + 14));
        if (name === 'NETSCAPE2.0') loop = bytes[i + 16]! | (bytes[i + 17]! << 8);
      }
      i = skipSubBlocks(bytes, i + 2);
    } else if (marker === 0x2c) {
      frames++;
      const local = bytes[i + 9]!;
      i += 10;
      if (local & 0x80) i += 3 * (1 << ((local & 7) + 1));
      i = skipSubBlocks(bytes, i + 1); // skip the LZW minimum code size byte, then the pixel data
    } else {
      throw new Error(`Unknown GIF block 0x${marker.toString(16)} at ${i}`);
    }
  }
  return { signature, width, height, frames, delays, loop, endsWithTrailer };
}
