/**
 * The words the fun features show (colouring pages and FILL, and the features that follow).
 * They live here, in one small module, so they are easy to translate.
 */
export const FUN_TEXT = {
  /** The Fill block for Little Turtles. */
  fillBlock: 'Fill',
  /** The FILL button on the Turtle Coders command shelf. */
  fillHint: 'Colour in the shape the turtle is inside',

  /** The row in the Save your drawing menu. */
  colouringRow: 'Colouring page',
  colouringRowHelp: 'Print the lines and colour them in',
  colouringRowHelpLittle: 'Print it and colour it in',

  /** The colouring page dialog. */
  colouringTitle: 'Your colouring page',
  colouringIntro: 'Black lines on white paper, ready for crayons. It fits on one A4 or Letter page.',
  colouringPreviewAlt: (title: string) => `Colouring page of ${title}: the lines of your drawing in black`,
  colouringPrint: 'Print',
  colouringClose: 'Close',
  colouringNothing: 'There are no lines to colour yet. Draw something first.',
  /** Small print at the bottom of the paper. */
  colouringFooter: 'Made with GIO',

  /** The Daily Turtle Puzzle row in the Save your drawing menu. */
  dailyRow: 'Daily puzzle',
  dailyRowHelp: 'A new turtle puzzle every day',
  dailyRowHelpLittle: 'A new puzzle every day',
  dailyRowSolved: 'Solved today. See your result',
  /** The Daily Turtle Puzzle dialog. */
  dailyTitle: 'Daily Turtle Puzzle',
  dailyNumber: (n: number) => `Puzzle #${n}`,
  dailyIntro: 'A new puzzle every day. Everyone gets the same one, and it works without the internet.',
  dailyPreviewAlt: 'Picture of the drawing to copy',
  dailyPlay: 'Play today\u2019s puzzle',
  dailyPlayAgain: 'Try for more stars',
  dailyClose: 'Close',
  dailySolvedTitle: 'You solved it!',
  dailyResult: (commands: number) => `${commands} ${commands === 1 ? 'command' : 'commands'}`,
  dailyStarsHelp: 'Three stars means you used as few commands as possible.',
  dailyTomorrow: 'Come back tomorrow for a new puzzle.',
  dailyShare: 'Share my result',
  dailyShareHelp: 'Your result is only a few words and stars. It does not give the answer away.',
  dailyShared: 'Shared!',
  dailyCopied: 'Copied! Paste it to a friend.',
  dailyShareFailed: 'I could not share it. You can copy the words above.',
  /** The quest card while the puzzle is open in the studio. */
  dailyEyebrow: (n: number) => `Daily puzzle #${n}`,
  dailySeeResult: 'See my result',
  dailyBubbleSolved: 'Puzzle solved! Tap See my result to share it.',
  /** What a child shares. It never says how the puzzle was solved. */
  dailyShareLine: (n: number, commands: number, stars: number) =>
    `GIO #${n} \u{1F422} solved in ${commands} ${commands === 1 ? 'command' : 'commands'} ${'\u2B50'.repeat(stars)}`,
} as const;
