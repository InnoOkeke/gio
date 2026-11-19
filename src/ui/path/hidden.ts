import type { Quest } from '../../logo/quests.js';

/**
 * The line a quest card adds when the checker also tries the program on inputs the child cannot see,
 * so the child knows a drawing that only matches the picture once is not enough. Null when every check is visible.
 */
export function hiddenTestLine(quest: Quest): string | null {
  if (quest.needs?.calls?.length) return 'I will also test it with other numbers.';
  if (quest.needs?.props) return 'I will also run it again to check it works every time.';
  return null;
}
