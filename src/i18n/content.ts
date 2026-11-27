import { getLocale } from './index.js';
import type { Lang } from './types.js';

/**
 * Data text in the child's language. The data files (quests, stages, friends, adventure levels) hold the English;
 * each locale's `content` holds the other languages by the same ids. Anything missing falls back to the English,
 * and Logo programs, targets and checks are never touched.
 */

export function localizeQuest<Q extends { id: string; title: string; goal: string; hint: string }>(quest: Q, lang: Lang): Q {
  if (lang === 'en') return quest;
  const text = getLocale(lang).content.quests[quest.id];
  if (!text) return quest;
  return { ...quest, title: text.title, goal: text.goal, hint: text.hint ?? quest.hint };
}

export function localizeStage<S extends { key: string; name: string; tagline: string }>(stage: S, lang: Lang): S {
  if (lang === 'en') return stage;
  const text = getLocale(lang).content.stages[stage.key];
  return text ? { ...stage, name: text.name, tagline: text.tagline } : stage;
}

export function conceptText<C extends { name: string; badge: string }>(id: string, english: C, lang: Lang): C {
  if (lang === 'en') return english;
  const text = getLocale(lang).content.concepts[id];
  return text ? { ...english, name: text.name, badge: text.badge } : english;
}

export function localizeFriend<F extends { id: string; species: string; idea: string; hint: string }>(friend: F, lang: Lang): F {
  if (lang === 'en') return friend;
  const text = getLocale(lang).content.friends[friend.id];
  return text ? { ...friend, ...text } : friend;
}

export function localizeSticker<S extends { id: string; name: string; hint: string }>(sticker: S, lang: Lang): S {
  if (lang === 'en') return sticker;
  const text = getLocale(lang).content.stickers[sticker.id];
  return text ? { ...sticker, ...text } : sticker;
}

/** A pool of lines Gio says, by pool id. The translated pool may have a different number of lines. */
export function linePool(id: string, english: readonly string[], lang: Lang): readonly string[] {
  if (lang === 'en') return english;
  return getLocale(lang).content.lines[id] ?? english;
}

/** One piece of adventure text (realm name, level title, intro line, hint) by id. */
export function adventureText(id: string, english: string, lang: Lang): string {
  if (lang === 'en') return english;
  return getLocale(lang).content.adventure[id] ?? english;
}

interface LevelText {
  id: string;
  title: string;
  story: string;
  goal: string;
  boss?: { name: string; art: string };
  hints: readonly { text: string }[];
}

/** An adventure level with its title, story, goal, boss name and hints in the child's language. Its map, code and checks stay. */
export function localizeLevel<L extends LevelText>(level: L, lang: Lang): L {
  if (lang === 'en') return level;
  const at = (part: string, english: string) => adventureText(`${level.id}.${part}`, english, lang);
  return {
    ...level,
    title: at('title', level.title),
    story: at('story', level.story),
    goal: at('goal', level.goal),
    ...(level.boss ? { boss: { ...level.boss, name: at('boss', level.boss.name) } } : {}),
    hints: level.hints.map((h, i) => ({ ...h, text: at(`hint.${i}`, h.text) })),
  };
}
