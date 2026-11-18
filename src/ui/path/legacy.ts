/**
 * The 20 quests that existed before the adventure map. Children already hold these ids in
 * `gio.progress`, so they keep their meaning. A concept badge used to be earned by clearing every
 * one of these for a mode; migration uses that old rule so no badge ever disappears.
 */
export const LEGACY_QUEST_IDS: readonly string[] = [
  'l-walk',
  'l-corner',
  'l-square',
  'l-repeat-square',
  'l-triangle',
  'l-colours',
  'l-circle',
  'l-stairs',
  'c-line',
  'c-square',
  'c-repeat',
  'c-star',
  'c-bug-square',
  'c-function',
  'c-shape',
  'c-bug-triangle',
  'c-dashes',
  'c-game',
  'c-sketch',
  'c-spiral',
];
