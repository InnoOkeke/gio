import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { levelById, type AgeModeId, type Level, type LevelOutcome, type RealmId } from '../../logo/adventure/index.js';
import { AdventureScene } from '../adventure/AdventureScene';
import { AdventureKeys } from '../adventure/AdventureKeys';
import { BossArt } from '../adventure/art/creatures';
import { REALM_PALETTES } from '../adventure/art/tiles';
import { DescribeSheet } from '../adventure/DescribeSheet';
import { hintLadder, shouldOfferHint } from '../adventure/hints';
import { HintSheet } from '../adventure/HintSheet';
import { IntroCard } from '../adventure/IntroCard';
import { adventureKeys, keySnippet, type AdventureKey } from '../adventure/keys';
import { realmName } from '../adventure/realms';
import { ResultCard } from '../adventure/ResultCard';
import { cellAhead } from '../adventure/scene-state';
import { StarRow } from '../adventure/StarRow';
import { followingLevel, levelKey, levelNumber, levelStatus } from '../adventure/state';
import { usePlay } from '../adventure/usePlay';
import { useAdventure, type FinishResult } from '../adventure/useAdventure';
import '../adventure/adventure.css';
import { FriendDialog } from '../components/lazy-overlays';
import { ArrowLeftIcon, BulbIcon, PauseIcon, PlayIcon, ResetIcon, RabbitSpeedIcon, RocketSpeedIcon, StepIcon, TurtleSpeedIcon, SpeakerIcon } from '../components/icons';
import { SoundToggle } from '../components/SoundToggle';
import { WatchIcon } from '../adventure/WatchIcon';
import { rescueLine } from '../adventure/rescue';
import { friendById, stickerById, type FriendId, type StickerId } from '../gio/catalog';
import type { LogoEditorHandle } from '../editor/LogoEditor';
import { useMode } from '../mode';
import { useRewards } from '../rewards';
import { useIsCompact, useMedia } from '../responsive/useMedia';
import type { Speed } from '../runtime/player';
import { useReadAloud } from '../speech';
import { useKeyboardInset } from '../responsive/useKeyboardInset';
import { useWatchMode } from '../adventure/useWatchMode';

const AdventureEditor = lazy(() => import('../adventure/AdventureEditor').then((m) => ({ default: m.AdventureEditor })));
const AdventureBlocks = lazy(() => import('../adventure/AdventureBlocks').then((m) => ({ default: m.AdventureBlocks })));

const SPEEDS: { id: Speed; label: string; Icon: typeof RabbitSpeedIcon }[] = [
  { id: 'turtle', label: 'Slow', Icon: TurtleSpeedIcon },
  { id: 'rabbit', label: 'Normal', Icon: RabbitSpeedIcon },
  { id: 'rocket', label: 'Fast', Icon: RocketSpeedIcon },
];

/** What each feature teaches, for the cage that opened without its friend coming home. */
const FEATURE_WORDS: Record<string, string> = { REPEAT: 'REPEAT', IF: 'IF', TO: 'TO', MAKE: 'MAKE', RECURSION: 'a command that calls itself' };
const OWN_WORD = /^\s*TO\s+(SWIM|JUMP|FREE|REST|AHEAD|HERE|GEMS)\b/im;

/** A level's page: the map, the plan, and a dock to run it. */
export default function AdventureLevel() {
  const { levelId } = useParams();
  const { mode } = useMode();
  const m: AgeModeId = mode ?? 'coder';
  const level = levelId ? levelById(levelId) : undefined;
  const { state } = useAdventure();
  if (!level) return <LevelMessage title="That level is not here" text="Pick a level from the map." />;
  if (!level.modes.includes(m)) {
    return <LevelMessage title="This level is for Turtle Coders" text="Little Turtles have their own levels. Pick one from the map." />;
  }
  const status = levelStatus(state, m, level);
  if (!status.open) {
    return <LevelMessage title="This level is still locked" text="Win the level before it to open this one." />;
  }
  return <LevelPlay key={`${m}:${level.id}`} level={level} mode={m} />;
}

function LevelMessage({ title, text }: { title: string; text: string }) {
  return (
    <div className="adv-root">
      <main className="adv-message">
        <h1 className="adv-result-title">{title}</h1>
        <p className="adv-result-line">{text}</p>
        <Link to="/adventure" className="btn btn-primary btn-lg">
          Back to the map
        </Link>
      </main>
    </div>
  );
}

interface Finished {
  outcome: LevelOutcome;
  result: FinishResult;
  friendLine: string | null;
  stickers: string[];
}

function LevelPlay({ level, mode }: { level: Level; mode: AgeModeId }) {
  const adventure = useAdventure();
  const rewards = useRewards();
  const compact = useIsCompact();
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const speech = useReadAloud(mode === 'little');
  const editorRef = useRef<LogoEditorHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const watch = useWatchMode(rootRef);
  useKeyboardInset();
  const key = levelKey(mode, level.id);

  const [code, setCode] = useState(() => adventure.plans[key] ?? level.starter?.[mode] ?? '');
  const codeRef = useRef(code);
  codeRef.current = code;
  const [speed, setSpeed] = useState<Speed>('rabbit');
  const [problem, setProblem] = useState<{ text: string; line: number | null } | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [friendQueue, setFriendQueue] = useState<FriendId[]>([]);
  const [introOpen, setIntroOpen] = useState(() => !adventure.state.intros.includes(level.realm));
  const [describeOpen, setDescribeOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hintShown, setHintShown] = useState(1);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [failStreak, setFailStreak] = useState(0);
  const [hintOffered, setHintOffered] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const steps = useMemo(() => hintLadder(level, mode), [level, mode]);
  const keys = useMemo(() => adventureKeys(level, mode), [level, mode]);
  const blocksPlan = mode === 'little';
  const palette = REALM_PALETTES[level.realm];

  const onProblem = useCallback((outcome: LevelOutcome) => {
    setProblem({ text: outcome.message, line: outcome.line });
    if (outcome.line !== null) editorRef.current?.setProblemLine(outcome.line);
  }, []);

  const onFinished = useCallback(
    (outcome: LevelOutcome, ran: string) => {
      const result = adventure.finish(level, mode, ran, outcome);
      let friendLine: string | null = null;
      const stickers: string[] = [];
      if (outcome.status === 'won') {
        const owned = rewards.state.friends;
        const earned = result.reward ? rewards.record(result.reward) : { newFriends: [] as FriendId[], newStickers: [] as StickerId[] };
        if (earned.newFriends.length) setFriendQueue((q) => [...q, ...earned.newFriends]);
        for (const id of earned.newStickers) stickers.push(stickerById(id).name);
        const art = level.friend?.art;
        if (art === 'critter' && outcome.friendsFreed > 0) {
          friendLine = `A critter is free! Friends rescued: ${result.state.critters}`;
        } else if (art && art !== 'critter' && outcome.friendsFreed > 0) {
          friendLine = friendStory(art, level.friend?.feature, earned.newFriends.includes(art), owned.includes(art));
        }
      }
      setFinished({ outcome, result, friendLine, stickers });
      setFailStreak((n) => (outcome.status === 'won' ? 0 : n + 1));
      if (outcome.status !== 'won') speech.speak(outcome.message);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setResultOpen(true), outcome.status === 'won' ? 900 : 450);
    },
    [adventure, level, mode, rewards, speech],
  );

  const play = usePlay(level, mode, { speed, reducedMotion: reduced, onProblem, onFinished });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Gio's line on the map shows the running line in the editor.
  useEffect(() => {
    editorRef.current?.setRunningLine(play.frame?.line ?? null);
  }, [play.frame]);

  // The last plan is kept per level, so reopening the level resumes the work.
  useEffect(() => {
    const id = window.setTimeout(() => adventure.rememberPlan(mode, level.id, code), 500);
    return () => window.clearTimeout(id);
  }, [adventure, code, level.id, mode]);

  const onChange = useCallback((next: string) => {
    setCode(next);
    setProblem(null);
  }, []);

  const clearAnswer = () => {
    setFinished(null);
    setResultOpen(false);
    setProblem(null);
    setTrail([]);
    editorRef.current?.setProblemLine(null);
  };

  const go = () => {
    if (play.status !== 'playing') clearAnswer();
    play.go(codeRef.current);
  };
  const step = () => {
    clearAnswer();
    play.step(codeRef.current);
  };
  const reset = () => {
    play.reset();
    clearAnswer();
    editorRef.current?.setRunningLine(null);
  };
  const tryAgain = () => {
    setResultOpen(false);
    play.reset();
    editorRef.current?.setRunningLine(null);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.findIndex((s) => s.id === speed) + 1) % SPEEDS.length]!.id;
    setSpeed(next);
    play.setSpeed(next);
  };

  const pressKey = (k: AdventureKey) => {
    if (k.kind === 'inline') editorRef.current?.insertInline(k.insert);
    else editorRef.current?.insert(keySnippet(k));
  };

  const showHints = (shown: number) => {
    setHintShown(shown);
    const withTrail = steps.slice(0, shown).filter((s) => s.trail.length > 0);
    setTrail(withTrail[withTrail.length - 1]?.trail ?? []);
  };
  const openHint = () => {
    setResultOpen(false);
    setHintOpen(true);
    showHints(hintShown);
    speech.speak(steps[hintShown - 1]?.text ?? '');
  };
  const insertReveal = (reveal: string) => {
    if (blocksPlan) setCode(codeRef.current.trim() === '' ? reveal : `${codeRef.current.trimEnd()}\n${reveal}`);
    else if (codeRef.current.trim() === '') editorRef.current?.replaceAll(reveal);
    else editorRef.current?.insert(reveal);
    setHintOpen(false);
    setHintOffered(true);
    window.setTimeout(() => editorRef.current?.focus(), 0);
  };

  const record = adventure.state.levels[key];
  const par = level.par[mode] ?? 1;
  const following = followingLevel(mode, level);
  const nextOpen = following && levelStatus(adventure.state, mode, following).open ? following : null;
  const offerHint = shouldOfferHint(failStreak, hintOffered);
  const playing = play.status === 'playing';
  const scene = play.scene;
  const frame = play.frame;
  const bump = frame?.action && frame.action.kind === 'lose' ? play.trace.slice(frame.action.from, frame.action.end).find((e) => e.type === 'bump') : undefined;
  const highlight = bump && bump.type === 'bump' ? { col: bump.col, row: bump.row } : null;
  const aheadOk = bump === undefined && frame?.action?.kind === 'lose' ? cellAhead(scene.gio) : null;
  const sceneFit = scene.cols >= scene.rows ? 100 : (scene.cols / scene.rows) * 100;
  const speedNow = SPEEDS.find((s) => s.id === speed)!;
  const own = OWN_WORD.exec(code)?.[1];

  const say = problem
    ? { kind: 'problem' as const, text: problem.text }
    : finished && play.status === 'done'
      ? { kind: finished.outcome.status === 'won' ? ('success' as const) : ('problem' as const), text: finished.outcome.status === 'won' ? 'You did it!' : finished.outcome.message }
      : play.narration && play.status !== 'idle'
        ? { kind: 'info' as const, text: play.narration }
        : { kind: 'info' as const, text: level.story };

  const dockButtons = (
    <>
      <button type="button" className={compact ? `btn dock-run ${playing ? 'btn-stop' : 'btn-primary'}` : `btn btn-lg adv-go ${playing ? 'btn-stop' : 'btn-primary'}`} onClick={go}>
        {playing ? <PauseIcon size={24} /> : <PlayIcon size={24} />}
        {playing ? 'Pause' : play.status === 'paused' ? 'Keep going' : 'Go'}
      </button>
      <button type="button" className={compact ? 'btn btn-quiet dock-btn' : 'btn btn-quiet btn-lg adv-dock-btn'} onClick={step} disabled={playing}>
        <StepIcon size={22} />
        <span>Step</span>
      </button>
      <button type="button" className={compact ? 'btn btn-quiet dock-btn' : 'btn btn-quiet btn-lg adv-dock-btn'} onClick={reset} disabled={play.status === 'idle' && !problem}>
        <ResetIcon size={22} />
        <span>Reset</span>
      </button>
      <button type="button" className={compact ? 'btn btn-quiet dock-btn' : 'btn btn-quiet btn-lg adv-dock-btn'} onClick={openHint} aria-haspopup="dialog">
        <BulbIcon size={22} className="adv-bulb" />
        <span>Hint</span>
      </button>
    </>
  );

  return (
    <div className="adv-root" ref={rootRef} data-status={play.status} data-realm={level.realm} data-watch={watch.active ? 'true' : undefined}>
      <header className="adv-header">
        <div className="adv-header-bar">
          <Link to="/adventure" className="btn btn-quiet adv-back" aria-label="Back to the map">
            <ArrowLeftIcon />
          </Link>
          <div className="adv-title-block">
            <p className="adv-eyebrow">
              {realmName(level.realm)} <span aria-hidden="true">&middot;</span> Level {levelNumber(level, mode)}
            </p>
            <h1 className="adv-title">{level.title}</h1>
          </div>
          <StarRow stars={record?.stars ?? 0} size={22} />
          <SoundToggle />
        </div>
      </header>
      <main className="adv-main" data-boss={level.kind === 'boss'}>
        <div className="adv-goal">
          {level.kind === 'boss' && level.boss && (
            <div className="adv-boss">
              <BossArt art={level.boss.art} name={level.boss.name} gems={scene.gems} gemsTotal={scene.gemsTotal} palette={palette} />
            </div>
          )}
          <p className="adv-goal-text">{level.goal}</p>
          <span className="adv-gems" aria-label={`${scene.gems} of ${scene.gemsTotal} gems`}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 2.5 20 9l-8 12.5L4 9Z" fill="#7ad7ff" stroke="#17261f" strokeOpacity="0.45" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            <span aria-hidden="true">
              {scene.gems} of {scene.gemsTotal}
            </span>
          </span>
        </div>
        <div className="adv-scene-cell">
          <div className="adv-scene-box">
            <div className="adv-scene-fit" style={{ width: `${sceneFit}%` }}>
              <AdventureScene level={level} scene={scene} mood={frame?.mood ?? 'idle'} tween={frame?.tween ?? false} seconds={frame?.seconds ?? 0.2} highlight={highlight ?? (aheadOk ? { col: aheadOk[0], row: aheadOk[1] } : null)} trail={trail} />
            </div>
          </div>
        </div>
        <div className="adv-say">
          <div className={`bubble bubble-${say.kind} adv-bubble`} role="status" aria-live="polite" key={say.text}>
            {say.text}
          </div>
          <div className="adv-tools">
            <button type="button" className="btn btn-quiet adv-tool" onClick={() => setDescribeOpen(true)} aria-haspopup="dialog" aria-label="Describe the map">
              <SpeakerIcon size={22} />
            </button>
            <button ref={watch.buttonRef} type="button" className="btn btn-quiet adv-tool adv-watch" onClick={watch.toggle} aria-pressed={watch.active} aria-label={watch.active ? 'Leave watch mode' : 'Watch full screen'}>
              <WatchIcon size={22} />
            </button>
            <button type="button" className="btn btn-quiet adv-tool" onClick={cycleSpeed} aria-label={`Speed: ${speedNow.label}. Tap to change`}>
              <speedNow.Icon size={24} />
            </button>
          </div>
        </div>
        <nav className={compact ? 'action-dock adv-dock' : 'adv-dock'} aria-label="Actions">
          {dockButtons}
        </nav>
        <section className="adv-plan panel" aria-label="Your plan">
          <div className="adv-plan-head">
            <h2 className="adv-plan-title">Your plan</h2>
            <span className="adv-plan-note">1 step = 50</span>
          </div>
          <div className="adv-editor" data-plan={blocksPlan ? 'blocks' : 'code'}>
            <Suspense fallback={<div className="adv-editor-wait" aria-busy="true" />}>
              {blocksPlan ? (
                <AdventureBlocks level={level} code={code} runningLine={play.frame?.line ?? null} problemLine={problem?.line ?? null} onChange={onChange} />
              ) : (
                <AdventureEditor ref={editorRef} initialCode={code} onChange={onChange} onRunShortcut={go} />
              )}
            </Suspense>
          </div>
          {own && <p className="adv-own">Your {own.toUpperCase()} replaces Gio&apos;s {own.toUpperCase()}.</p>}
          {!blocksPlan && <AdventureKeys keys={keys} onKey={pressKey} onGo={go} />}
        </section>
      </main>
      {introOpen && (
        <IntroCard
          realm={level.realm as RealmId}
          speak={speech.supported ? speech.speak : undefined}
          onGo={() => {
            setIntroOpen(false);
            adventure.introSeen(level.realm);
          }}
        />
      )}
      {resultOpen && finished && (
        <ResultCard
          level={level}
          number={levelNumber(level, mode)}
          outcome={finished.outcome}
          stars={record?.stars ?? finished.outcome.stars}
          par={par}
          next={nextOpen}
          opened={finished.result.opensRealm}
          friendLine={finished.friendLine}
          stickers={finished.stickers}
          offerHint={offerHint}
          onHint={openHint}
          onTryAgain={tryAgain}
          onClose={() => setResultOpen(false)}
        />
      )}
      {hintOpen && (
        <HintSheet
          steps={steps}
          shown={hintShown}
          onMore={() => showHints(Math.min(steps.length, hintShown + 1))}
          onInsert={insertReveal}
          onClose={() => {
            setHintOpen(false);
            setHintOffered(true);
          }}
        />
      )}
      {describeOpen && <DescribeSheet scene={scene} speak={speech.supported ? speech.speak : undefined} onClose={() => setDescribeOpen(false)} />}
      {!resultOpen && !hintOpen && !introOpen && friendQueue[0] && (
        <Suspense fallback={null}>
          <FriendDialog key={friendQueue[0]} friend={friendById(friendQueue[0])} onClose={() => setFriendQueue((q) => q.slice(1))} />
        </Suspense>
      )}
    </div>
  );
}

/** What happened to a caged friend, in a sentence: freed and welcomed, already known, or the cage opened without the friend coming home. */
function friendStory(art: FriendId, feature: string | undefined, welcomed: boolean, owned: boolean): string {
  const name = friendById(art).name;
  if (welcomed) return `You freed ${name}! ${rescueLine(art)}`.trim();
  if (owned) return `You already know ${name}!`;
  if (feature && feature !== 'bug-fixed') return `The cage is open! Next time try ${FEATURE_WORDS[feature] ?? feature} and ${name} will come home with you.`;
  return `The cage is open! Fix the bug in the plan and ${name} will come home with you.`;
}