import type { Quest } from '../../logo/quests.js';
import { translator, type Lang } from '../../i18n/index.js';

/**
 * The line a quest card adds when the checker also tries the program on inputs the child cannot see,
 * so the child knows a drawing that only matches the picture once is not enough. Null when every check is visible.
 */
export function hiddenTestLine(quest: Quest, lang: Lang = 'en'): string | null {
  if (quest.needs?.calls?.length) return translator(lang)('quest.hidden.calls');
  if (quest.needs?.props) return translator(lang)('quest.hidden.props');
  return null;
}
