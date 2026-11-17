export type GioMood = 'idle' | 'happy' | 'curious' | 'thinking' | 'cheer' | 'calm';

const BY_KIND = { success: 'happy', problem: 'curious', info: 'idle' } as const satisfies Record<string, GioMood>;

/** Gio's mood for a bubble message. An explicit mood always wins. */
export function moodFor(message: { kind: keyof typeof BY_KIND; mood?: GioMood }): GioMood {
  return message.mood ?? BY_KIND[message.kind];
}
