/** One pending callback that a newer one replaces. React-free, so a fake timer can test it. */
export interface Delayed {
  /** Run `fn` after `ms`. Any callback still waiting is dropped first. */
  schedule(fn: () => void, ms: number): void;
  /** Drop the waiting callback, if any. */
  cancel(): void;
}

export function createDelayed(): Delayed {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  return {
    schedule(fn, ms) {
      cancel();
      timer = setTimeout(() => {
        timer = null;
        fn();
      }, ms);
    },
    cancel,
  };
}
