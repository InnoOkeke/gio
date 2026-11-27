import type { Block } from '../src/logo/blocks.js';
/** The numbers the block steppers can reach (src/ui/editor/BlocksEditor.tsx). */
export const onGrid = (blocks: Block[]): boolean =>
  blocks.every((b) => {
    switch (b.kind) {
      case 'forward':
      case 'back':
        return b.n >= 0 && b.n <= 300 && b.n % 10 === 0;
      case 'right':
      case 'left':
        return b.n >= 0 && b.n <= 360 && b.n % 15 === 0;
      case 'circle':
        return b.n >= 10 && b.n <= 150 && b.n % 10 === 0;
      case 'size':
        return b.n >= 1 && b.n <= 20;
      case 'repeat':
        return b.n >= 1 && b.n <= 36 && onGrid(b.body);
      default:
        return true;
    }
  });
