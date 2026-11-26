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
} as const;
