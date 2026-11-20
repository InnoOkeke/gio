/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      screens: {
        medium: '600px',
        expanded: '840px',
        large: '1200px',
        land: { raw: '(orientation: landscape)' },
        short: { raw: '(max-height: 500px)' },
        coarse: { raw: '(pointer: coarse)' },
        fine: { raw: '(pointer: fine)' },
        hoverable: { raw: '(hover: hover)' },
      },
      spacing: { touch: '48px', 'touch-lg': '56px' },
      minHeight: { touch: '48px', 'touch-lg': '56px' },
      minWidth: { touch: '48px', 'touch-lg': '56px' },
      colors: {
        ink: { DEFAULT: '#17261f', 2: '#44554c', 3: '#66756d' },
        paper: { DEFAULT: '#f5f2ea', 2: '#fbf9f4', 3: '#f2eee4' },
        line: '#e7e1d4',
        turtle: { DEFAULT: '#12a36b', ink: '#0b7a4f', soft: '#e1f7ec' },
      },
      fontFamily: {
        sans: ['"Nunito Variable"', 'ui-rounded', '"SF Pro Rounded"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', '"SF Mono"', '"Cascadia Code"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
