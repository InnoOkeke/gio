import { describe, expect, it } from 'vitest';
import { execute, type TurtleEvent } from '../src/logo/index.js';
import { encodeGifBytes } from '../src/ui/export/gif';
import { planReplay, REPLAY_LIMITS } from '../src/ui/export/replay';
import { readGif } from './helpers/gif';

function events(source: string): TurtleEvent[] {
  const res = execute(source);
  if (!res.ok) throw new Error(`Expected success, got: ${res.problem.message}`);
  return res.result.events;
}

describe('planReplay', () => {
  it('returns no pictures for an empty drawing', () => {
    expect(planReplay([], REPLAY_LIMITS)).toEqual([]);
  });

  it('keeps between 24 and 100 pictures', () => {
    const tiny = planReplay(events('FD 10'), REPLAY_LIMITS);
    const huge = planReplay(events('REPEAT 400 [FD 100 RT 91]'), REPLAY_LIMITS);
    expect(tiny).toHaveLength(24);
    expect(huge).toHaveLength(100);
    const medium = planReplay(events('REPEAT 10 [FD 100 RT 36]'), REPLAY_LIMITS);
    expect(medium.length).toBeGreaterThanOrEqual(24);
    expect(medium.length).toBeLessThanOrEqual(100);
  });

  it('never goes backwards and ends with the whole drawing', () => {
    const list = events('REPEAT 5 [FD 80 RT 144] DOT 10 10 PU FD 40 PD CS REPEAT 6 [FD 30 RT 60]');
    const frames = planReplay(list, REPLAY_LIMITS);
    let before = -1;
    for (const f of frames) {
      const position = f.upto + f.fraction;
      expect(position).toBeGreaterThanOrEqual(before);
      before = position;
      expect(f.fraction).toBeGreaterThanOrEqual(0);
      expect(f.fraction).toBeLessThan(1);
    }
    const last = frames[frames.length - 1]!;
    expect(last.upto).toBe(list.length);
    expect(last.fraction).toBe(0);
    expect(last.t).toBe(1);
    expect(last.sprite).toMatchObject({ x: list[list.length - 1]!.state.x, y: list[list.length - 1]!.state.y });
  });

  it('puts the turtle part way along a long line in the middle pictures', () => {
    const frames = planReplay(events('FD 300'), REPLAY_LIMITS);
    const ys = frames.map((f) => f.sprite.y);
    expect(ys[0]).toBeGreaterThan(0);
    expect(ys[0]).toBeLessThan(100);
    expect(ys[ys.length - 1]).toBe(300);
  });

  it('still makes pictures for a drawing that only turns on the spot and dots', () => {
    const frames = planReplay(events('PU RT 90 RT 90 RT 90 DOT 0 0'), REPLAY_LIMITS);
    expect(frames.length).toBeGreaterThanOrEqual(24);
    expect(frames[frames.length - 1]!.sprite.heading).toBe(270);
  });
  it('gives a FRAME program one picture per FRAME, without padding', () => {
    const list = events('REPEAT 5 [CLEAN FD 10 * REPCOUNT FRAME RT 20]');
    const frames = planReplay(list, REPLAY_LIMITS);
    expect(frames).toHaveLength(5);
    for (const f of frames) {
      expect(list[f.upto - 1]!.type).toBe('frame');
      expect(f.fraction).toBe(0);
    }
    const last = frames[4]!;
    expect(last.t).toBe(1);
    // The last picture holds every line drawn before the final FRAME.
    const lastFrame = list.map((e) => e.type).lastIndexOf('frame');
    expect(last.upto).toBe(lastFrame + 1);
    expect(last.sprite).toMatchObject({ x: list[lastFrame]!.state.x, y: list[lastFrame]!.state.y });
  });
  it('samples a long movie down to 100 pictures and keeps the last one', () => {
    const list = events('REPEAT 150 [FD 1 FRAME]');
    const frames = planReplay(list, REPLAY_LIMITS);
    expect(frames).toHaveLength(100);
    const uptos = frames.map((f) => f.upto);
    expect([...uptos].sort((a, b) => a - b)).toEqual(uptos);
    expect(new Set(uptos).size).toBe(100);
    expect(uptos[99]).toBe(list.map((e) => e.type).lastIndexOf('frame') + 1);
  });
});

describe('encodeGifBytes', () => {
  const size = 16;
  function solid(rgb: [number, number, number]): Uint8ClampedArray {
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
    return data;
  }

  it('writes a looping GIF89a with every frame, its delay and the trailer', async () => {
    const frames = [
      { data: solid([255, 255, 255]), delay: 80 },
      { data: solid([255, 0, 0]), delay: 80 },
      { data: solid([255, 0, 0]), delay: 1800 },
    ];
    const bytes = await encodeGifBytes(frames, size);
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);
    const info = readGif(bytes);
    expect(info).toMatchObject({ signature: 'GIF89a', width: size, height: size, frames: 3, loop: 0, endsWithTrailer: true });
    expect(info.delays).toEqual([80, 80, 1800]);
  });

  it('stops when the movie is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(encodeGifBytes([{ data: solid([0, 0, 0]), delay: 80 }], size, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('refuses an empty movie', async () => {
    await expect(encodeGifBytes([], size)).rejects.toThrow();
  });
});
