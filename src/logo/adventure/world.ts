import { LogoError } from '../errors.js';
import type { Value, WorldHost, WorldPose } from '../interpreter.js';
import { CELL, cellCentre, countIn, DIR_HEADING, DIR_STEP, DIRS, mapSize, type Dir, type Level } from './level.js';
import type { AheadWord } from './words.js';

export type LoseReason =
  | 'rock'
  | 'water'
  | 'dry'
  | 'edge'
  | 'enemy'
  | 'fire'
  | 'gate'
  | 'cage'
  | 'nothing-to-free'
  | 'no-boots'
  | 'bad-landing'
  | 'tired'
  | 'bad-step'
  | 'bad-turn';

/** A cell and which way Gio faces, in grid terms (row 0 is the top). */
export interface GridPose {
  col: number;
  row: number;
  dir: Dir;
}

export type AdvEvent =
  | { type: 'step' | 'swim' | 'jump' | 'rest' | 'turn' | 'free'; line: number; beat: number; pose: GridPose }
  | { type: 'gem' | 'power'; line: number; beat: number; pose: GridPose; what: 'gem' | 'boots' | 'shield' | 'shield-pop' }
  | { type: 'bump'; line: number; beat: number; pose: GridPose; reason: LoseReason; col: number; row: number }
  | { type: 'beat'; line: number; beat: number; pose: GridPose; enemies: { id: string; col: number; row: number }[]; fires: [number, number][] }
  | { type: 'hit'; line: number; beat: number; pose: GridPose; reason: 'enemy' | 'fire'; absorbed: boolean }
  | { type: 'win' | 'lose'; line: number; beat: number; pose: GridPose };

/** Most beats one plan may take before Gio gets tired. */
export const MAX_BEATS = 400;

export const LOSE_MESSAGES: Record<LoseReason, string> = {
  rock: 'Oof, a rock!',
  water: "Gio can't walk on water. Try SWIM.",
  dry: 'SWIM only works when the next step is water.',
  edge: 'Gio walked off the edge of the map.',
  enemy: 'A Grumble bumped into Gio!',
  fire: 'Ouch, that fire was hot!',
  gate: 'The gate is shut. Collect every gem to open it.',
  cage: 'A cage is in the way. Use FREE to open it.',
  'nothing-to-free': 'There is no cage in front of Gio to FREE.',
  'no-boots': 'Gio needs boots to JUMP.',
  'bad-landing': "Gio can't land there.",
  tired: 'Gio got tired. Is a REPEAT going round forever?',
  'bad-step': 'Gio walks in steps of 50. Try FD 50.',
  'bad-turn': 'Gio turns in quarter turns. Try RT 90.',
};

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * The adventure simulation. It answers the interpreter's commands one beat at a time and is a pure
 * function of (level map, commands): there is no randomness and no real clock.
 */
export class AdventureWorld implements WorldHost {
  readonly cols: number;
  readonly rows: number;
  /** Mutable copy of the map. Picked up gems, boots, shields and opened cages become ground. */
  private cells: string[][];
  col: number;
  row: number;
  dir: Dir;
  beat = 0;
  gems = 0;
  readonly gemsTotal: number;
  friendsFreed = 0;
  readonly friendsTotal: number;
  boots = false;
  shield = false;
  private safeUntil = -1;
  status: 'playing' | 'won' | 'lost' = 'playing';
  reason: LoseReason | null = null;
  message = '';
  failLine: number | null = null;
  readonly trace: AdvEvent[] = [];
  private line = 1;
  private readonly hasGoal: boolean;
  private readonly requireGems: boolean;
  private readonly level: Level;

  constructor(
    level: Level,
    map: string[],
    private readonly record = true,
    from?: AdventureWorld,
  ) {
    this.level = level;
    const size = from ?? mapSize(map);
    this.cols = size.cols;
    this.rows = size.rows;
    this.cells = (from?.cells ?? map.map((r) => [...r].map((c) => (c === 'S' ? '.' : c)))).map((r) => [...r]);
    this.gemsTotal = from?.gemsTotal ?? countIn(map, 'g');
    this.friendsTotal = from?.friendsTotal ?? countIn(map, 'F');
    this.hasGoal = from?.hasGoal ?? countIn(map, 'G') > 0;
    this.requireGems = level.kind === 'boss';
    this.col = from?.col ?? level.start.col;
    this.row = from?.row ?? level.start.row;
    this.dir = from?.dir ?? level.start.dir;
    if (from) {
      this.beat = from.beat;
      this.gems = from.gems;
      this.friendsFreed = from.friendsFreed;
      this.boots = from.boots;
      this.shield = from.shield;
      this.safeUntil = from.safeUntil;
      this.status = from.status;
      this.reason = from.reason;
    }
  }

  /** A copy that can be stepped without touching this one. Used by the solver in the tests. */
  clone(): AdventureWorld {
    return new AdventureWorld(this.level, [], false, this);
  }

  get finished(): boolean {
    return this.status === 'won';
  }

  get gridPose(): GridPose {
    return { col: this.col, row: this.row, dir: this.dir };
  }

  pose(): WorldPose {
    const c = cellCentre(this.col, this.row, this.cols, this.rows);
    return { x: c.x, y: c.y, heading: DIR_HEADING[this.dir] };
  }

  /** Beats after which enemies and fires repeat, so a solver can fold the beat counter. */
  period(): number {
    let p = 1;
    for (const e of this.level.enemies ?? []) p = (p * e.route.length) / gcd(p, e.route.length);
    for (const f of this.level.fires ?? []) p = (p * f.period) / gcd(p, f.period);
    return p;
  }

  /** A compact description of the whole state, for a search that must not revisit it. */
  key(): string {
    const safe = this.safeUntil >= this.beat ? this.safeUntil - this.beat : -1;
    return [this.col, this.row, this.dir, this.beat % this.period(), this.boots ? 1 : 0, this.shield ? 1 : 0, safe, this.cells.map((r) => r.join('')).join('|')].join(',');
  }

  // ----- the interpreter's side -----

  command(name: string, arg: number | null, line: number): WorldPose {
    this.line = line;
    switch (name) {
      case 'FORWARD':
        this.walk(arg ?? 0, 1);
        break;
      case 'BACK':
        this.walk(arg ?? 0, -1);
        break;
      case 'RIGHT':
        this.turn(arg ?? 0, 1);
        break;
      case 'LEFT':
        this.turn(arg ?? 0, -1);
        break;
      case 'SWIM':
        this.swim();
        break;
      case 'JUMP':
        this.jump();
        break;
      case 'FREE':
        this.free();
        break;
      case 'REST':
        this.advanceBeat(this.col, this.row);
        this.note({ type: 'rest' });
        break;
      default:
        throw new LogoError(`Gio doesn't know how to ${name} here.`, { line, column: 1 });
    }
    return this.pose();
  }

  reporter(name: string): Value | undefined {
    switch (name) {
      case 'AHEAD':
        return this.ahead();
      case 'HERE': {
        const here = this.charAt(this.col, this.row);
        return here === '~' ? 'water' : here === 'G' ? 'goal' : 'clear';
      }
      case 'GEMS':
        return this.gems;
      default:
        return undefined;
    }
  }

  // ----- sensing -----

  private charAt(col: number, row: number): string | undefined {
    return this.cells[row]?.[col];
  }

  private enemyAt(route: [number, number][], beat: number): [number, number] {
    return route[beat % route.length]!;
  }

  private enemyOn(col: number, row: number, beat: number): boolean {
    return (this.level.enemies ?? []).some((e) => {
      const [c, r] = this.enemyAt(e.route, beat);
      return c === col && r === row;
    });
  }

  private litCells(beat: number): [number, number][] {
    const lit: [number, number][] = [];
    for (const f of this.level.fires ?? []) if (f.on.includes(beat % f.period)) lit.push(...f.cells);
    return lit;
  }

  private fireOn(col: number, row: number, beat: number): boolean {
    return this.litCells(beat).some(([c, r]) => c === col && r === row);
  }

  /** What Gio would find one beat from now in the cell in front. */
  private ahead(): AheadWord {
    const [dc, dr] = DIR_STEP[this.dir];
    const col = this.col + dc;
    const row = this.row + dr;
    const ch = this.charAt(col, row);
    if (ch === undefined) return 'edge';
    const next = this.beat + 1;
    if (this.enemyOn(col, row, next)) return 'enemy';
    if (this.fireOn(col, row, next)) return 'fire';
    if (ch === 'F') return 'friend';
    if (ch === 'D' && this.gems < this.gemsTotal) return 'gate';
    if (ch === '#') return 'rock';
    if (ch === '~') return 'water';
    if (ch === 'G') return 'goal';
    if (ch === 'g') return 'gem';
    return 'clear';
  }

  // ----- acting -----

  private note(event: { type: AdvEvent['type'] } & Record<string, unknown>): void {
    if (!this.record) return;
    this.trace.push({ line: this.line, beat: this.beat, pose: this.gridPose, ...event } as AdvEvent);
  }

  private lose(reason: LoseReason, at?: { col: number; row: number }): never {
    this.status = 'lost';
    this.reason = reason;
    this.message = LOSE_MESSAGES[reason];
    this.failLine = this.line;
    if (at) this.note({ type: 'bump', reason, col: at.col, row: at.row });
    this.note({ type: 'lose' });
    throw new LogoError(this.message, { line: this.line, column: 1 });
  }

  private turn(degrees: number, sign: 1 | -1): void {
    if (!Number.isInteger(degrees / 90)) this.lose('bad-turn');
    const quarter = (((sign * degrees) / 90) % 4 + 4) % 4;
    this.dir = DIRS[(DIRS.indexOf(this.dir) + quarter) % 4]!;
    this.note({ type: 'turn' });
  }

  private walk(distance: number, sign: 1 | -1): void {
    if (!Number.isInteger(distance / CELL)) this.lose('bad-step');
    const steps = Math.abs(distance) / CELL;
    const way = distance < 0 ? -sign : sign;
    for (let k = 0; k < steps && this.status === 'playing'; k++) this.stepOnto(way as 1 | -1);
  }

  private blockedBy(ch: string): LoseReason | null {
    if (ch === '#') return 'rock';
    if (ch === 'F') return 'cage';
    if (ch === '~') return 'water';
    if (ch === 'D' && this.gems < this.gemsTotal) return 'gate';
    return null;
  }

  private stepOnto(way: 1 | -1): void {
    const [dc, dr] = DIR_STEP[this.dir];
    const col = this.col + dc * way;
    const row = this.row + dr * way;
    const ch = this.charAt(col, row);
    if (ch === undefined) this.lose('edge', { col, row });
    const blocked = this.blockedBy(ch);
    if (blocked) this.lose(blocked, { col, row });
    this.moveTo(col, row, 'step');
  }

  private swim(): void {
    const [dc, dr] = DIR_STEP[this.dir];
    const col = this.col + dc;
    const row = this.row + dr;
    const ch = this.charAt(col, row);
    if (ch === undefined) this.lose('edge', { col, row });
    if (ch !== '~') this.lose('dry', { col, row });
    this.moveTo(col, row, 'swim');
  }

  private jump(): void {
    if (!this.boots) this.lose('no-boots');
    const [dc, dr] = DIR_STEP[this.dir];
    const col = this.col + dc * 2;
    const row = this.row + dr * 2;
    const ch = this.charAt(col, row);
    if (ch === undefined) this.lose('edge', { col, row });
    if (this.blockedBy(ch)) this.lose('bad-landing', { col, row });
    this.moveTo(col, row, 'jump');
  }

  private free(): void {
    const [dc, dr] = DIR_STEP[this.dir];
    const col = this.col + dc;
    const row = this.row + dr;
    if (this.charAt(col, row) !== 'F') this.lose('nothing-to-free', { col, row });
    this.cells[row]![col] = '.';
    this.friendsFreed++;
    this.advanceBeat(this.col, this.row);
    this.note({ type: 'free' });
    if (this.status === 'playing' && !this.hasGoal && this.objectivesMet()) this.win();
  }

  private objectivesMet(): boolean {
    return this.friendsFreed >= this.friendsTotal && (!this.requireGems || this.gems >= this.gemsTotal);
  }

  private win(): void {
    this.status = 'won';
    this.note({ type: 'win' });
  }

  private moveTo(col: number, row: number, kind: 'step' | 'swim' | 'jump'): void {
    const prev = { col: this.col, row: this.row };
    this.col = col;
    this.row = row;
    this.pickUp();
    this.advanceBeat(prev.col, prev.row);
    this.note({ type: kind });
    if (this.status === 'playing' && this.charAt(col, row) === 'G' && this.objectivesMet()) this.win();
  }

  private pickUp(): void {
    const ch = this.charAt(this.col, this.row);
    const take = (what: 'gem' | 'boots' | 'shield') => {
      this.cells[this.row]![this.col] = '.';
      this.note({ type: what === 'gem' ? 'gem' : 'power', what });
    };
    if (ch === 'g') {
      this.gems++;
      take('gem');
    } else if (ch === 'j') {
      this.boots = true;
      take('boots');
    } else if (ch === 'o') {
      this.shield = true;
      take('shield');
    }
  }

  /** One beat passes. Enemies and fire move, and may hit Gio. */
  private advanceBeat(fromCol: number, fromRow: number): void {
    this.beat++;
    if (this.beat > MAX_BEATS) this.lose('tired');
    const b = this.beat;
    if (this.record) {
      this.note({
        type: 'beat',
        enemies: (this.level.enemies ?? []).map((e) => {
          const [col, row] = this.enemyAt(e.route, b);
          return { id: e.id, col, row };
        }),
        fires: this.litCells(b),
      });
    }
    const hitByEnemy = (this.level.enemies ?? []).some((e) => {
      const [c, r] = this.enemyAt(e.route, b);
      const [pc, pr] = this.enemyAt(e.route, b - 1);
      const sameCell = c === this.col && r === this.row;
      const swapped = c === fromCol && r === fromRow && pc === this.col && pr === this.row;
      return sameCell || swapped;
    });
    const hitByFire = this.fireOn(this.col, this.row, b);
    if (!hitByEnemy && !hitByFire) return;
    const reason = hitByEnemy ? 'enemy' : 'fire';
    if (this.safeUntil >= b) return;
    if (this.shield) {
      this.shield = false;
      this.safeUntil = b + 1;
      this.note({ type: 'hit', reason, absorbed: true });
      this.note({ type: 'power', what: 'shield-pop' });
      return;
    }
    this.note({ type: 'hit', reason, absorbed: false });
    this.lose(reason);
  }
}
