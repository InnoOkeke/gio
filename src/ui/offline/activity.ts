/**
 * What the studio is doing, for the app's status layer: is a program running right now, and has a drawing finished
 * in this visit. The install tip waits for a finished drawing and never appears while the turtle is moving.
 */
export interface Activity {
  running: boolean;
  finishedDrawing: boolean;
}

let activity: Activity = { running: false, finishedDrawing: false };
const listeners = new Set<() => void>();

/** Called by the studio whenever the player's status changes ('idle' | 'playing' | 'paused' | 'done'). */
export function reportPlayerStatus(status: string): void {
  const running = status === 'playing' || status === 'paused';
  const finishedDrawing = activity.finishedDrawing || status === 'done';
  if (running === activity.running && finishedDrawing === activity.finishedDrawing) return;
  activity = { running, finishedDrawing };
  for (const listener of listeners) listener();
}

export function getActivity(): Activity {
  return activity;
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
