/**
 * Live check of the "I'm stuck" tutor against a running GIO server and the real model (Amazon Bedrock).
 * Run with: GIO_URL=http://localhost:3055 npm run check:tutor
 *
 * Asserts that levels 1 and 2 never hand over code, that level 2's line comes from GIO's interpreter,
 * that level 3's changes turn the child's program into one that passes the quest, and that the
 * blocklist still turns away bad words inside code.
 */
import { applyChanges, leaksFix, type LineChange } from '../src/ai/tutor.js';
import { diagnose } from '../src/logo/diagnose.js';
import { checkQuest, QUESTS } from '../src/logo/quests.js';

const BASE = process.env['GIO_URL'] ?? 'http://localhost:3001';

interface Reply {
  status: number;
  json: { success: boolean; data?: { text: string; line?: number; changes?: LineChange[] }; error?: string; code?: string };
}

let failures = 0;
function expect(ok: boolean, what: string): void {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures += 1;
}

async function hint(level: number, code: string, style: 'code' | 'blocks', questId?: string): Promise<Reply> {
  const res = await fetch(`${BASE}/api/ai/hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, code, style, questId }),
  });
  return { status: res.status, json: (await res.json()) as Reply['json'] };
}

async function walk(label: string, code: string, style: 'code' | 'blocks', questId: string): Promise<void> {
  const quest = QUESTS.find((q) => q.id === questId);
  if (!quest) throw new Error(`Unknown quest ${questId}`);
  const diagnosis = diagnose(code, quest);
  console.log(`\n${label} (quest ${questId}, diagnosis: ${diagnosis.kind})`);

  for (const level of [1, 2, 3]) {
    const r = await hint(level, code, style, questId);
    console.log(`Level ${level}: HTTP ${r.status}`);
    if (r.status !== 200 || !r.json.success || !r.json.data) {
      console.log(`  ${r.json.error ?? 'no data'}`);
      expect(false, `level ${level} returned a hint`);
      continue;
    }
    const { text, line, changes } = r.json.data;
    console.log(`  text: ${text}`);
    expect(text.trim().length > 0, `level ${level} has text`);
    if (level === 1) expect(!leaksFix(text) && text.includes('?'), 'level 1 is a question with no code');
    if (level === 2) {
      expect(!leaksFix(text), 'level 2 has no code or command with a number');
      if (diagnosis.kind === 'error' && diagnosis.line !== null) expect(line === diagnosis.line, `level 2 line ${line} is the interpreter's line ${diagnosis.line}`);
      else expect(line === undefined, 'level 2 invents no line when the interpreter found none');
    }
    if (level === 3) {
      expect(!!changes && changes.length > 0, 'level 3 has changes');
      if (changes?.length) {
        for (const c of changes) console.log(`  line ${c.line}: ${JSON.stringify(c.was)} -> ${JSON.stringify(c.now)}`);
        const fixed = applyChanges(code, changes);
        expect(checkQuest(quest, fixed).pass, 'the corrected program passes the quest');
      }
    }
  }
}

async function main(): Promise<void> {
  console.log(`Checking ${BASE}`);
  const square = QUESTS.find((q) => q.id === 'c-bug-square')!;
  await walk('Broken square, Turtle Coders', square.starter!, 'code', 'c-bug-square');
  await walk('Wrong corner, Little Turtles', 'FD 100\nRT 45\nFD 100', 'blocks', 'l-corner');

  console.log('\nBad words inside code');
  const bad = await hint(1, 'FD 10 ; shit', 'code');
  console.log(`  HTTP ${bad.status}, code ${bad.json.code}`);
  expect(bad.status === 422 && bad.json.code === 'redirect', 'a blocklisted comment is turned away with a redirect');

  if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll tutor checks passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
