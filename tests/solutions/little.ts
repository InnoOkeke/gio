/**
 * Reference solutions for the 42 new Little Turtles quests (stages 4 to 10), written as a child would build them
 * from blocks: plain numbers on the stepper grid and the block colours only.
 */
const R = 'SETPENCOLOR "red';
const B = 'SETPENCOLOR "blue';
const G = 'SETPENCOLOR "green';
const O = 'SETPENCOLOR "orange';
const P = 'SETPENCOLOR "purple';
const Y = 'SETPENCOLOR "yellow';
export const LITTLE_SOLUTIONS: Record<string, string> = {
  // Pen Playground
  'l-pen-gap': 'FD 50\nPU\nFD 50\nPD\nFD 50',
  'l-pen-dashes': 'REPEAT 4 [\n  FD 20\n  PU\n  FD 20\n  PD\n]',
  'l-pen-jump': 'REPEAT 4 [\n  FD 50\n  RT 90\n]\nPU\nRT 90\nFD 100\nLT 90\nPD\nREPEAT 4 [\n  FD 50\n  RT 90\n]',
  'l-pen-dotted-ring': 'REPEAT 12 [\n  FD 20\n  PU\n  FD 20\n  PD\n  RT 30\n]',
  'l-pen-train': `${R}\nREPEAT 2 [\n  FD 60\n  RT 90\n  FD 120\n  RT 90\n]\n${B}\nPU\nRT 90\nFD 30\nPD\nCIRCLE 20\nPU\nFD 60\nPD\nCIRCLE 20`,
  'l-pen-ladder': 'FD 120\nBK 120\nREPEAT 5 [\n  FD 20\n  RT 90\n  FD 40\n  BK 40\n  LT 90\n]\nRT 90\nFD 40\nLT 90\nFD 20\nBK 120',
  // Flower Fields
  'l-flower-three': 'REPEAT 3 [\n  FD 40\n  CIRCLE 40\n  BK 40\n  RT 120\n]',
  'l-flower-eight': 'REPEAT 8 [\n  FD 40\n  CIRCLE 30\n  BK 40\n  RT 45\n]',
  'l-daisy': 'CIRCLE 20\nREPEAT 12 [\n  PU\n  FD 30\n  PD\n  FD 40\n  PU\n  BK 70\n  PD\n  RT 30\n]',
  'l-bubbles': 'CIRCLE 10\nPU\nFD 30\nPD\nCIRCLE 20\nPU\nFD 50\nPD\nCIRCLE 30\nPU\nFD 70\nPD\nCIRCLE 40',
  'l-sunflower': `${O}\nCIRCLE 40\n${Y}\nREPEAT 12 [\n  FD 60\n  CIRCLE 20\n  BK 60\n  RT 30\n]`,
  'l-garden': `${R}\nREPEAT 6 [\n  FD 20\n  CIRCLE 20\n  ${G}\n  BK 20\n  RT 60\n  ${R}\n]\nPU\nRT 90\nFD 120\nLT 90\nPD\n${B}\nREPEAT 6 [\n  FD 20\n  CIRCLE 20\n  BK 20\n  RT 60\n]`,
  // Pattern Park
  'l-spin-triangles': `${R}\nREPEAT 12 [\n  REPEAT 3 [\n    FD 60\n    RT 120\n    ${B}\n  ]\n  RT 30\n  ${R}\n]`,
  'l-spin-boxes': `${R}\nREPEAT 8 [\n  REPEAT 4 [\n    FD 50\n    RT 90\n    ${B}\n  ]\n  RT 45\n  ${R}\n]`,
  'l-petal-square': `${R}\nREPEAT 4 [\n  CIRCLE 40\n  PU\n  FD 80\n  RT 90\n  PD\n  ${B}\n]`,
  'l-fan': `${G}\nCIRCLE 20\nREPEAT 3 [\n  ${R}\n  REPEAT 4 [\n    FD 70\n    BK 70\n    RT 15\n    ${B}\n  ]\n  RT 60\n]`,
  'l-weave': `REPEAT 8 [\n  ${R}\n  REPEAT 4 [\n    FD 30\n    RT 90\n    ${B}\n  ]\n  ${G}\n  FD 30\n  RT 45\n]`,
  'l-wheel': `${R}\nCIRCLE 80\nCIRCLE 10\n${B}\nREPEAT 24 [\n  FD 80\n  BK 80\n  RT 15\n]`,
  // Picture Town
  'l-house-pic': `${R}\nREPEAT 4 [\n  FD 80\n  RT 90\n]\n${B}\nFD 80\nRT 30\nREPEAT 3 [\n  FD 80\n  RT 120\n]`,
  'l-tree-pic': `${O}\nREPEAT 2 [\n  FD 70\n  RT 90\n  FD 20\n  RT 90\n]\n${G}\nPU\nRT 90\nFD 10\nLT 90\nFD 110\nPD\nCIRCLE 40`,
  'l-boat-pic': `${B}\nREPEAT 2 [\n  FD 30\n  RT 90\n  FD 100\n  RT 90\n]\n${R}\nPU\nRT 90\nFD 50\nLT 90\nFD 30\nPD\nREPEAT 3 [\n  FD 70\n  RT 120\n]`,
  'l-rocket-pic':
    `${R}\nREPEAT 2 [\n  FD 100\n  RT 90\n  FD 40\n  RT 90\n]\nPU\nFD 100\nPD\n${B}\nRT 30\nREPEAT 3 [\n  FD 40\n  RT 120\n]\nLT 30\nPU\nBK 40\nRT 90\nFD 20\nLT 90\nPD\n${O}\nCIRCLE 10`,
  'l-snow-pic': `${P}\nRT 90\nREPEAT 3 [\n  FD 150\n  LT 120\n]\nPU\nFD 180\nLT 90\nFD 120\nPD\n${O}\nCIRCLE 30\n${Y}\nREPEAT 8 [\n  PU\n  FD 60\n  PD\n  FD 30\n  PU\n  BK 90\n  PD\n  RT 45\n]`,
  'l-town-pic': `${R}\nREPEAT 3 [\n  REPEAT 4 [\n    FD 60\n    RT 90\n  ]\n  ${B}\n  FD 60\n  RT 30\n  REPEAT 3 [\n    FD 60\n    RT 120\n  ]\n  ${G}\n  LT 30\n  BK 60\n  PU\n  RT 90\n  FD 90\n  LT 90\n  PD\n]`,
  // Star Sky
  'l-star-pair': `REPEAT 8 [\n  FD 50\n  RT 135\n]\nPU\nRT 90\nFD 100\nLT 90\nPD\nREPEAT 8 [\n  FD 50\n  RT 135\n]`,
  'l-star-mix': `${R}\nREPEAT 12 [\n  FD 40\n  RT 150\n]\nPU\nRT 90\nFD 100\nLT 90\nPD\n${B}\nREPEAT 8 [\n  FD 40\n  RT 135\n]`,
  'l-star-night': `${Y}\nREPEAT 8 [\n  FD 40\n  RT 135\n]\nPU\nRT 90\nFD 100\nLT 90\nPD\n${B}\nREPEAT 12 [\n  FD 30\n  RT 150\n]\nPU\nRT 90\nFD 100\nLT 90\nPD\n${Y}\nREPEAT 8 [\n  FD 40\n  RT 135\n]`,
  'l-star-ring': `${R}\nREPEAT 6 [\n  PU\n  FD 60\n  PD\n  REPEAT 8 [\n    FD 30\n    RT 135\n    ${B}\n  ]\n  PU\n  BK 60\n  PD\n  RT 60\n]`,
  'l-star-four': `${R}\nREPEAT 8 [\n  FD 30\n  RT 135\n]\nPU\nRT 90\nFD 70\nLT 90\nPD\n${B}\nREPEAT 8 [\n  FD 30\n  RT 135\n]\nPU\nRT 90\nFD 70\nLT 90\nPD\n${R}\nREPEAT 8 [\n  FD 30\n  RT 135\n]\nPU\nRT 90\nFD 70\nLT 90\nPD\n${B}\nREPEAT 8 [\n  FD 30\n  RT 135\n]`,
  'l-star-five': `${R}\nREPEAT 8 [\n  FD 20\n  RT 135\n]\nPU\nRT 90\nFD 50\nLT 90\nPD\n${B}\nREPEAT 12 [\n  FD 20\n  RT 150\n]\nPU\nRT 90\nFD 50\nLT 90\nPD\n${G}\nREPEAT 8 [\n  FD 20\n  RT 135\n]\nPU\nRT 90\nFD 50\nLT 90\nPD\n${R}\nREPEAT 12 [\n  FD 20\n  RT 150\n]\nPU\nRT 90\nFD 50\nLT 90\nPD\n${B}\nREPEAT 8 [\n  FD 20\n  RT 135\n]`,
  // Block Saver
  'l-save-square': 'REPEAT 4 [\n  FD 100\n  RT 90\n]',
  'l-save-star': 'REPEAT 12 [\n  FD 40\n  RT 150\n]',
  'l-save-flower': 'REPEAT 8 [\n  CIRCLE 30\n  FD 40\n  RT 45\n]',
  'l-save-ring': 'REPEAT 12 [\n  REPEAT 3 [\n    FD 50\n    RT 120\n  ]\n  RT 30\n]',
  'l-save-fan': 'CIRCLE 80\nREPEAT 24 [\n  FD 80\n  BK 80\n  RT 15\n]',
  'l-save-spin': 'REPEAT 24 [\n  REPEAT 4 [\n    FD 50\n    RT 90\n  ]\n  RT 15\n]',
  // Logo Master Lighthouse
  'l-lh-castle': `${O}\nREPEAT 2 [\n  FD 60\n  RT 90\n  FD 150\n  RT 90\n]\n${B}\nPU\nFD 60\nPD\nREPEAT 3 [\n  REPEAT 4 [\n    FD 30\n    RT 90\n  ]\n  PU\n  RT 90\n  FD 60\n  LT 90\n  PD\n]`,
  'l-lh-lighthouse':
    `${R}\nREPEAT 2 [\n  FD 100\n  RT 90\n  FD 40\n  RT 90\n]\nPU\nFD 100\nPD\n${B}\nREPEAT 4 [\n  FD 40\n  RT 90\n]\nFD 40\nRT 30\nREPEAT 3 [\n  FD 40\n  RT 120\n]\nLT 30\nPU\nBK 20\nRT 90\nFD 20\nLT 90\n${Y}\nREPEAT 8 [\n  FD 60\n  PD\n  FD 30\n  PU\n  BK 90\n  RT 45\n]`,
  'l-lh-fish': `${O}\nREPEAT 3 [\n  CIRCLE 30\n  PU\n  RT 90\n  FD 30\n  PD\n  ${B}\n  REPEAT 3 [\n    FD 30\n    RT 120\n    ${G}\n  ]\n  PU\n  BK 30\n  LT 90\n  FD 90\n  PD\n]`,
  'l-lh-rainbow': `${R}\nCIRCLE 110\n${O}\nCIRCLE 90\n${Y}\nCIRCLE 70\n${G}\nCIRCLE 50\n${B}\nCIRCLE 30\nPU\nRT 90\nFD 110\nPD\nCIRCLE 20\nPU\nBK 220\nPD\nCIRCLE 20`,
  'l-lh-windmill': `${Y}\nPU\nLT 90\nFD 120\nRT 90\nFD 60\nPD\nCIRCLE 30\nPU\nBK 60\nRT 90\nFD 120\nLT 90\nPD\n${B}\nREPEAT 4 [\n  REPEAT 3 [\n    FD 50\n    RT 120\n  ]\n  RT 90\n]\n${O}\nBK 120\nPU\nLT 90\nFD 30\nRT 90\nPD\n${R}\nBK 40\nRT 90\nFD 60\nLT 90\nFD 40\nLT 90\nFD 60\nRT 90`,
  'l-lh-mosaic': `${R}\nREPEAT 4 [\n  REPEAT 2 [\n    ${R}\n    REPEAT 4 [\n      FD 30\n      RT 90\n    ]\n    PU\n    RT 90\n    FD 40\n    LT 90\n    PD\n    ${B}\n    REPEAT 4 [\n      FD 30\n      RT 90\n    ]\n    PU\n    RT 90\n    FD 40\n    LT 90\n    PD\n  ]\n  PU\n  LT 90\n  FD 160\n  RT 90\n  FD 40\n  PD\n]`,
};
/**
 * Block Saver answers that draw the right picture but spend too many blocks (one Repeat, everything inside spelled
 * out). Every one of them must be told to use fewer blocks.
 */
export const LITTLE_NAIVE: Record<string, string> = {
  'l-save-square': 'REPEAT 2 [\n  FD 100\n  RT 90\n  FD 100\n  RT 90\n]',
  'l-save-star': 'REPEAT 6 [\n  FD 40\n  RT 150\n  FD 40\n  RT 150\n]',
  'l-save-flower': 'REPEAT 4 [\n  CIRCLE 30\n  FD 40\n  RT 45\n  CIRCLE 30\n  FD 40\n  RT 45\n]',
  'l-save-ring': 'REPEAT 12 [\n  REPEAT 3 [\n    FD 50\n    RT 120\n  ]\n  RT 30\n  PU\n  PD\n]',
  'l-save-fan': 'CIRCLE 80\nREPEAT 24 [\n  FD 80\n  BK 80\n  RT 15\n]\nPU\nPD',
  'l-save-spin': 'REPEAT 24 [\n  REPEAT 4 [\n    FD 50\n    RT 90\n  ]\n  RT 15\n  PU\n  PD\n]',
};
