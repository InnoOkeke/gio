import { BASE_SOLUTIONS } from './base';
import { CODER_A_SOLUTIONS } from './coder-a';
import { CODER_B_SOLUTIONS } from './coder-b';

/** Reference solutions for every quest, keyed by quest id. Later content files are merged in here. */
export const SOLUTIONS: Record<string, string> = {
  ...BASE_SOLUTIONS,
  ...CODER_A_SOLUTIONS,
  ...CODER_B_SOLUTIONS,
};
