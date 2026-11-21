/**
 * Guards against mojibake: UTF-8 text that was read as Windows-1252 and saved again, which turns "…" into "â€¦" and
 * "·" into "Â·" on screen. Every tracked source and doc file must be clean UTF-8 without these sequences or a BOM.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '..');
const EXT = /\.(ts|tsx|css|html|md|json|sh|webmanifest|txt|svg)$/;
// A UTF-8 lead byte shown as Windows-1252 (Â to ô) followed by a continuation byte shown as Windows-1252.
const MOJIBAKE =
  /[\u00C2-\u00F4][\u0080-\u00BF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201A\u201C-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122]/;

const files = execFileSync('git', ['ls-files', '--', 'src', 'scripts', 'tests', 'docs', 'deploy', 'public', 'index.html', 'README.md'], { cwd: root, encoding: 'utf8' })
  .split('\n')
  .filter((f) => EXT.test(f) && f !== 'tests/encoding.test.ts');

describe('text encoding', () => {
  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no mojibake or byte order mark in any tracked text file', () => {
    const bad: string[] = [];
    for (const rel of files) {
      const buf = fs.readFileSync(path.join(root, rel));
      if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) bad.push(`${rel}: starts with a BOM`);
      buf
        .toString('utf8')
        .split('\n')
        .forEach((line, i) => {
          const m = MOJIBAKE.exec(line);
          if (m) bad.push(`${rel}:${i + 1}: "${line.slice(Math.max(0, m.index - 20), m.index + 12).trim()}"`);
        });
    }
    expect(bad).toEqual([]);
  });
});
