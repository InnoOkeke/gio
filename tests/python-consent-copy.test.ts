import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

/** The consent box, the privacy page and the README must tell a child the same thing about Python and data. */
describe('Python consent copy matches what the app does', () => {
  const panel = read('src', 'ui', 'components', 'PythonPanel.tsx');
  const privacy = read('src', 'ui', 'pages', 'Privacy.tsx');

  it('the consent box says Python needs the internet each time it starts', () => {
    expect(panel).toContain('needs the internet each time it starts');
  });
  it('the consent box no longer says the engine stays on the device', () => {
    expect(panel).not.toContain('then it stays on this device');
  });
  it('the privacy page says the same: downloaded again each time, needs the internet', () => {
    expect(privacy).toContain('downloaded again each time Python starts');
    expect(privacy).toContain('Python needs the internet to start');
  });
});
