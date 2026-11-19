/**
 * Prints and writes docs/STAGES.md: every stage with its quests, the measured difficulty of its reference
 * solutions, how many different skills they use, and how many quests have hidden tests or property checks.
 * The numbers come from the same measure the tests use, so the report shows whether the curve rises.
 * Run with: npm run report:stages
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { check } from '../src/logo/index.js';
import { complexity } from '../src/logo/difficulty.js';
import { features, wordsUsed, type Quest } from '../src/logo/quests.js';
import { islandsFor, questById, stageNumber, type Island } from '../src/ui/path/islands';
import { SOLUTIONS } from '../tests/solutions/index';
import { ADJACENT_EXEMPT, ADJACENT_TOLERANCE, mean, spearman } from '../tests/solutions/curve';

/** The skill each stage introduces, from the stage plan. */
const SKILL: Record<string, string> = {
  'coder:moves': 'FD, RT and polygons',
  'coder:loops': 'REPEAT',
  'coder:colour-cove': 'Colours, pen size, background, palette numbers',
  'coder:debugging': 'Fixing one bug',
  'coder:functions': 'Procedures with TO ... END',
  'coder:ingredients': 'Procedures with inputs and procedures calling procedures',
  'coder:variables': 'MAKE and arithmetic',
  'coder:grid': 'SETXY, DOT, coordinates, nested REPEAT',
  'coder:decisions': 'IF, IFELSE, REPCOUNT',
  'coder:surprise': 'RANDOM',
  'coder:events': 'WHEN keys',
  'coder:clockwork': 'WHEN "tick, SHOW, GAMEOVER',
  'coder:recursion': 'Recursion',
  'coder:fractals': 'Recursion with depth',
  'coder:bug-bay': 'Fixing several bugs, runtime bugs',
  'coder:tiny': 'Fewest commands',
  'coder:mirror': 'Symmetry and tiling',
  'coder:physics': 'Motion over ticks, bounce, gravity',
  'coder:game-studio': 'Multi-level games',
  'coder:master': 'Everything combined',
  'little:moves': 'Moves and turns',
  'little:loops': 'Repeat blocks',
  'little:colours': 'Colours',
  'little:pen': 'Pen up and down',
  'little:flowers': 'Circles and rings',
  'little:patterns': 'Spinning patterns',
  'little:pictures': 'Pictures from shapes',
  'little:stars': 'Stars',
  'little:fewest': 'Fewest blocks',
  'little:lighthouse': 'Everything combined',
};

/** Tiny Code Temple and Block Saver are about the fewest commands: their code is small on purpose. */
const EXEMPT: ReadonlySet<string> = new Set(['coder:tiny', 'little:fewest']);

function extras(q: Quest) {
  return {
    ticks: (q.presses ?? []).filter((p) => p === 'TICK').length,
    hiddenCalls: q.needs?.calls?.length ?? 0,
    propChecks: q.needs?.props ? Object.values(q.needs.props).length : 0,
  };
}

function row(island: Island) {
  const quests = island.units.flat().map((id) => {
    const q = questById(id);
    if (!q) throw new Error(`Unknown quest ${id} in ${island.key}`);
    return q;
  });
  const scores = quests.map((q) => {
    const code = SOLUTIONS[q.id];
    if (code === undefined) throw new Error(`No reference solution for ${q.id}`);
    return complexity(code, extras(q));
  });
  const skills = new Set<string>();
  for (const q of quests) {
    const parsed = check(SOLUTIONS[q.id]!);
    if (!parsed.ok) throw new Error(`Reference solution of ${q.id} does not parse`);
    for (const f of features(parsed.program)) skills.add(f);
    for (const w of wordsUsed(parsed.program)) skills.add(w);
  }
  return {
    island,
    quests: quests.length,
    mean: mean(scores),
    max: Math.max(...scores),
    skills: skills.size,
    hidden: quests.filter((q) => (q.needs?.calls?.length ?? 0) > 0).length,
    props: quests.filter((q) => q.needs?.props !== undefined).length,
  };
}

function scoreOf(q: Quest): number {
  const code = SOLUTIONS[q.id];
  if (code === undefined) throw new Error(`No reference solution for ${q.id}`);
  return complexity(code, extras(q));
}

function table(audience: 'coder' | 'little'): string[] {
  const lines = ['| Stage | Name | Skill | Quests | Mean difficulty | Hardest | Skills used | Hidden tests | Property checks |', '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for (const island of islandsFor(audience)) {
    const r = row(island);
    const note = EXEMPT.has(island.key) ? ' (small on purpose)' : '';
    lines.push(`| ${stageNumber(island)} | ${island.name} | ${SKILL[island.key] ?? ''}${note} | ${r.quests} | ${r.mean.toFixed(1)} | ${r.max.toFixed(1)} | ${r.skills} | ${r.hidden} | ${r.props} |`);
  }
  return lines;
}

/** The facts behind "does the curve rise": the rank correlation, every dip, the exemptions and the units the measure cannot rank. */
function curve(audience: 'coder' | 'little'): string[] {
  const rows = islandsFor(audience).map((island) => ({ island, stage: stageNumber(island), ...row(island) }));
  const measured = rows.filter((r) => !EXEMPT.has(r.island.key));
  const rho = spearman(
    measured.map((r) => r.stage),
    measured.map((r) => r.mean),
  );
  const out = [`Rank correlation between stage number and mean difficulty, across the ${measured.length} stages that are not small on purpose: **${rho.toFixed(2)}** (1 means every stage is harder than the one before it).`, ''];
  const dips = rows.filter((r, i) => i > 0 && r.mean < rows[i - 1]!.mean);
  if (dips.length === 0) out.push('No stage has a lower mean difficulty than the stage before it.');
  else {
    out.push('Stages whose mean difficulty is lower than the stage before it:', '');
    for (const d of dips) {
      const before = rows[d.stage - 2]!;
      const key = d.island.key;
      const note = key in ADJACENT_EXEMPT ? 'exempt, see below' : `within the ${Math.round(ADJACENT_TOLERANCE * 100)} per cent tolerance`;
      out.push(`- Stage ${d.stage} ${d.island.name}: ${d.mean.toFixed(1)} after stage ${before.stage} ${before.island.name}: ${before.mean.toFixed(1)} (${(d.mean / before.mean * 100).toFixed(0)} per cent; ${note}).`);
    }
  }
  const exempt = rows.filter((r) => r.island.key in ADJACENT_EXEMPT);
  out.push('', `Exempt from the adjacent-stage test (the other stages are compared with the last stage that is not exempt):`, '');
  for (const r of exempt) out.push(`- Stage ${r.stage} ${r.island.name}: ${ADJACENT_EXEMPT[r.island.key]}`);
  const unranked: string[] = [];
  for (const r of rows) {
    for (const [u, unit] of r.island.units.entries()) {
      const [a, b, c] = unit.map((id) => scoreOf(questById(id)!)) as [number, number, number];
      if (c < Math.min(a, b)) unranked.push(`stage ${r.stage} unit ${u + 1} (${a.toFixed(0)}, ${b.toFixed(0)}, ${c.toFixed(0)})`);
    }
  }
  out.push('', `In ${unranked.length} of ${rows.length * 2} units the third (own) quest has a smaller reference solution than both of the other two: ${unranked.join('; ') || 'none'}. The measure counts code, not the idea, so it does not claim to rank the quests inside a unit.`);
  return out;
}

const out = [
  '# GIO stages',
  '',
  'Generated by `npm run report:stages`. Do not edit by hand.',
  '',
  'Difficulty is the complexity of each quest\'s reference solution (statements, nesting, procedures, inputs, recursion, key handlers, variables and conditions, primitive families, ticks played, hidden calls and property checks; see `src/logo/difficulty.ts`). Tests require the stage number and the mean difficulty to rank together (see the rank correlation under each table), the second unit of every stage to be at least as hard as the first, no stage to fall below ' + `${Math.round(ADJACENT_TOLERANCE * 100)} per cent of the stage before it (apart from the named exemptions), and the last stage to be the hardest. The "small on purpose" stages are about writing the fewest commands, so their code is short and their difficulty is shown by the wasteful answers that must fail. The difficulty does not rise in every single step: the dips are listed under each table.` + '',
  '',
  '## Turtle Coders (20 stages, 120 quests)',
  '',
  ...table('coder'),
  '',
  ...curve('coder'),
  '',
  '## Little Turtles (10 stages, 60 quests)',
  '',
  ...table('little'),
  '',
  ...curve('little'),
  '',
].join('\n');

console.log(out);
const target = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'STAGES.md');
fs.writeFileSync(target, out, 'utf8');
console.log(`Wrote ${target}`);
