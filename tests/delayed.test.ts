import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDelayed } from '../src/ui/path/delayed';

describe('createDelayed', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the callback after the delay', () => {
    const d = createDelayed();
    const fn = vi.fn();
    d.schedule(fn, 800);
    vi.advanceTimersByTime(799);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('never shows the mastery moment after a new quest starts (cancel)', () => {
    const d = createDelayed();
    const moment = vi.fn();
    d.schedule(moment, 800);
    vi.advanceTimersByTime(300);
    d.cancel();
    vi.advanceTimersByTime(5000);
    expect(moment).not.toHaveBeenCalled();
  });

  it('a newer schedule replaces the waiting one', () => {
    const d = createDelayed();
    const first = vi.fn();
    const second = vi.fn();
    d.schedule(first, 800);
    d.schedule(second, 800);
    vi.advanceTimersByTime(800);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('cancel with nothing waiting is harmless, and the helper can be reused', () => {
    const d = createDelayed();
    d.cancel();
    const fn = vi.fn();
    d.schedule(fn, 10);
    vi.advanceTimersByTime(10);
    d.cancel();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
