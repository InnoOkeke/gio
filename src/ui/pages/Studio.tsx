import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { blocksToLogo, check, execute, press, start, toBlocks, type Block, type GameKey, type GameSession, type TargetLanguage, type TurtleEvent } from '../../logo/index.js';
import { TICK_MS } from '../../logo/primitives.js';
import { checkQuest, CONCEPTS, features, playWithPresses, type Quest } from '../../logo/quests.js';
import { api, ApiError, local, OFFLINE_MESSAGE, SLOW_MESSAGE, type AssistantStyle } from '../api';
import { reportPlayerStatus } from '../offline/activity';
import { AskTurtle } from '../components/AskTurtle';
import { CommandShelf } from '../components/CommandShelf';
import { GamePad } from '../components/GamePad';
import { Wordmark } from '../components/GioMark';
import {
  BulbIcon,
  HelpIcon,
  PauseIcon,
  PlayIcon,
  RabbitSpeedIcon,
  ResetIcon,
  RocketSpeedIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  StepIcon,
  TurtleSpeedIcon,
} from '../components/icons';
import { ExportMenu } from '../components/ExportMenu';
import { SoundToggle } from '../components/SoundToggle';
import { sound } from '../runtime/sound';
import { hasDrawing, toSVG } from '../export/svg';
import { FirstWinOffer, FirstWinYours, FIRST_WIN_TEXT, useFirstWin } from '../components/FirstWin';
import { AdventureMap, FriendDialog, GardenContent, GardenSheet, MasteryMoment, preloadMapWhenIdle } from '../components/lazy-overlays';
import type { Moment } from '../components/MasteryMoment';
import { QuestCard } from '../components/Quests';
import { HintCard } from '../components/HintCard';
import { SkillCheckBanner } from '../components/SkillCheckBanner';
import { Stage, type StageHandle } from '../components/Stage';
import { ActionDock } from '../components/ActionDock';
import { AskFold } from '../components/AskFold';
import { FocusOffer, FocusToggle, useFocusMode } from '../components/FocusMode';
import { StudioHeader } from '../components/StudioHeader';
import { commandsUsed } from '../../logo/daily.js';
import { recordDaily, savedResult, todaysPuzzle, type DailyResult, type TodaysPuzzle } from '../daily';
import { haptic } from '../haptics';
import { FUN_TEXT } from '../i18n-fun';
import { makeSticker } from '../export/sticker';
import { useWindowClass } from '../responsive/useWindowClass';
import '../responsive/studio.css';
import { useToast } from '../components/Toast';
import { TranslatedCode } from '../components/TranslatedCode';
import { PythonPanel } from '../components/PythonPanel';
import { usePythonRun } from '../python/usePythonRun';
import { TurtleBubble, type BubbleMessage } from '../components/TurtleBubble';
import { friendById, type FriendId } from '../gio/catalog';
import { GoldenShellContext } from '../gio/golden';
import { announce, hasEarned, mergeEarned, NOTHING, runSignals, stickerNames, type Earned, type RunSignals } from '../gio/earned';
import { DEFAULT_FIRST_COLOUR, firstWinProgram, markFirstWinShown, readFirstWin, shouldOfferFirstWin, type BlockColour } from '../first-win';
import { LINES, pickLine, welcomeBackLine } from '../gio/lines';
import { moodFor, type GioMood } from '../gio/mood';
import { daysAway, localDateKey } from '../gio/rewards';
import type { LogoEditorHandle } from '../editor/LogoEditor';
import { CommandKeyRow, applyKey } from '../components/CommandKeyRow';
import { useKeyboardInset } from '../responsive/useKeyboardInset';
import { MODE_LABEL, useMode, type AgeMode } from '../mode';
import { createDelayed } from '../path/delayed';
import { useQuestHelp } from '../path/help';
import { islandByKey, islandOf, placeOf } from '../path/islands';
import { useSkillCheck } from '../path/useSkillCheck';
import type { NextStop, Star } from '../path/state';
import { useProgress } from '../progress';
import { useRewards } from '../rewards';
import { useReadAloud } from '../speech';
import { useTutor } from '../tutor/useTutor';
import { parseVoiceCommand, type VoiceCommand } from '../voice-commands';
import type { PlayerStatus, Speed } from '../runtime/player';

const DEFAULT_TITLE = 'My drawing';

const WELCOME: Record<AgeMode, BubbleMessage> = {
  little: { kind: 'info', text: pickLine(LINES.little.greeting, 0) },
  coder: { kind: 'info', text: pickLine(LINES.coder.greeting, 0) },
};

const SPEEDS: { id: Speed; label: string; Icon: typeof TurtleSpeedIcon }[] = [
  { id: 'turtle', label: 'Slow', Icon: TurtleSpeedIcon },
  { id: 'rabbit', label: 'Fast', Icon: RabbitSpeedIcon },
  { id: 'rocket', label: 'Zoom', Icon: RocketSpeedIcon },
];

type CodeTab = 'logo' | TargetLanguage;

const CODE_TABS: { id: CodeTab; label: string }[] = [
  { id: 'logo', label: 'Logo' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
];

/** The comment on the first line of AI code is the drawing's title, e.g. "; Rainbow Flower". */
function titleFromCode(code: string): string | null {
  const first = code.split('\n')[0]?.trim() ?? '';
  const match = /^;\s*(.{1,80})$/.exec(first);
  return match ? match[1]!.trim() : null;
}

/** Blocks have no comments, so a Little Turtles program keeps its title in the drawing's name instead. */
function withoutComments(code: string): string {
  return code
    .split('\n')
    .map((l) => (l.includes(';') ? l.slice(0, l.indexOf(';')) : l).trimEnd())
    .filter((l) => l.trim())
    .join('\n');
}

function fileName(title: string, ext: string): string {
  const safe = title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  return `${safe || 'gio-drawing'}.${ext}`;
}
const ReplayDialog = lazy(() => import('../components/ReplayDialog'));
const ColouringDialog = lazy(() => import('../components/ColouringDialog'));
const DailyDialog = lazy(() => import('../components/DailyDialog'));
// Each editor loads only in the mode that uses it: dnd-kit with the blocks, CodeMirror with Coder code.
const BlocksEditor = lazy(() => import('../editor/BlocksEditor').then((m) => ({ default: m.BlocksEditor })));
const LogoEditor = lazy(() => import('../editor/LogoEditor').then((m) => ({ default: m.LogoEditor })));
const EditorSkeleton = () => <div className="h-full min-h-[240px] bg-paper-2 animate-pulse" aria-busy="true" aria-label="Loading the editor" />;

interface ReviewRun {
  islandKey: string;
  ids: string[];
  index: number;
  results: { questId: string; helped: boolean }[];
}

/** `saved` is the server's title and code when unsaved edits from this phone were put back on top of them. */
type Loaded = { title: string; code: string; slug: string | null; editKey: string | null; saved?: string };

export default function Studio() {
  const { slug: routeSlug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setLoadError(null);
    if (!routeSlug) {
      const draft = local.loadDraft();
      setLoaded({ title: draft?.title || DEFAULT_TITLE, code: draft?.code ?? '', slug: null, editKey: null });
      return;
    }
    api
      .getProject(routeSlug)
      .then((p) => {
        if (cancelled) return;
        // Edits this phone had not saved yet (kept across a reload or an app update) go back on top of the saved copy.
        const unsaved = local.loadUnsaved(p.slug);
        setLoaded({ title: unsaved?.title ?? p.title, code: unsaved?.code ?? p.code, slug: p.slug, editKey: local.editKeyFor(p.slug) ?? null, ...(unsaved ? { saved: `${p.title}\n${p.code}` } : {}) });
      })
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [routeSlug]);

  if (loadError) {
    return (
      <CenteredMessage
        title={loadError === OFFLINE_MESSAGE || loadError === SLOW_MESSAGE ? 'This drawing needs the internet' : "I couldn't find that drawing"}
        text={loadError === 'Project not found' ? 'The link might be wrong, or the drawing was never saved.' : loadError}
        action={{ label: 'Start a new drawing', run: () => navigate('/') }}
      />
    );
  }
  if (!loaded) return <CenteredMessage title="Getting the turtle ready…" />;
  return <StudioView key={loaded.slug ?? 'new'} initial={loaded} />;
}

function StudioView({ initial }: { initial: Loaded }) {
  const { mode: chosenMode, chooseAgain } = useMode();
  const mode: AgeMode = chosenMode ?? 'coder';
  const little = mode === 'little';
  const style: AssistantStyle = little ? 'blocks' : 'code';

  const editorRef = useRef<LogoEditorHandle>(null);
  const stageRef = useRef<StageHandle>(null);
  const toast = useToast();
  const progress = useProgress(mode);
  /** Where the child got help on the current quest. It decides gold or silver stars. */
  const help = useQuestHelp();
  /** A skill check in play: the stages to skip and which challenge the child is on. */
  const skill = useSkillCheck();
  const navigate = useNavigate();
  const { state: rewards, record, wear } = useRewards();
  /** A child who has learned before and been away 3 or more days gets a warm welcome back. */
  const [cameBack] = useState(() => rewards.days.length > 0 && daysAway(rewards.days, localDateKey(new Date())) >= 3);
  /** A brand-new child on an empty page is offered one big button that draws a star. */
  const [offerFirstWin] = useState(() =>
    shouldOfferFirstWin({ mode, shown: readFirstWin(), completedQuests: progress.completed, learnedDays: rewards.days, draftCode: initial.code, onSharedLink: initial.slug !== null }),
  );
  const firstWin = useFirstWin(offerFirstWin);
  const readAloud = useReadAloud(little);
  const undoStack = useRef<string[]>([]);
  const tutor = useTutor();
  const stuckRef = useRef<HTMLButtonElement>(null);
  useEffect(preloadMapWhenIdle, []);

  const [title, setTitle] = useState(initial.title);
  const [code, setCode] = useState(initial.code);
  const [project, setProject] = useState<{ slug: string; editKey: string | null } | null>(
    initial.slug ? { slug: initial.slug, editKey: initial.editKey } : null,
  );
  const [savedSnapshot, setSavedSnapshot] = useState(initial.saved ?? (initial.slug ? `${initial.title}\n${initial.code}` : ''));
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [speed, setSpeed] = useState<Speed>(little ? 'turtle' : 'rabbit');
  const [bubble, setBubble] = useState<BubbleMessage>(initial.code ? { kind: 'info', text: 'Press Run to watch me draw it!' } : offerFirstWin ? { kind: 'info', text: FIRST_WIN_TEXT[mode].offer } : cameBack ? { kind: 'info', text: welcomeBackLine() } : WELCOME[mode]);
  const [prints, setPrints] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeTab, setCodeTab] = useState<CodeTab>('logo');
  const [runningLine, setRunningLine] = useState<number | null>(null);
  const [showLogoUnderBlocks, setShowLogoUnderBlocks] = useState(false);

  /* Gio's reactions and rewards. Only the child's own working code earns anything. */
  const [friendQueue, setFriendQueue] = useState<FriendId[]>([]);
  const [moodLive, setMoodLive] = useState(true);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  /** Code someone or something else wrote: the latest AI answer, quest starters, a shared link. Unchanged, it earns nothing. */
  const borrowedRef = useRef<Set<string>>(new Set(initial.slug && initial.code.trim() ? [initial.code.trim()] : []));
  const lastRunRef = useRef<RunSignals | null>(null);
  const failedCodeRef = useRef<string | null>(null);
  const runCountRef = useRef(0);

  const [questsOpen, setQuestsOpen] = useState(false);
  const [gardenOpen, setGardenOpen] = useState(false);
  const [movie, setMovie] = useState<{ events: readonly TurtleEvent[]; background: string } | null>(null);
  /** The drawing shown as a colouring page, while that dialog is open. */
  const [colouring, setColouring] = useState<readonly TurtleEvent[] | null>(null);
  /** The Daily Turtle Puzzle dialog: today's puzzle and, once solved, its result. */
  const [daily, setDaily] = useState<{ today: TodaysPuzzle; result: DailyResult | null } | null>(null);
  /** The daily puzzle being played, so a solve is recorded under the number it was opened with. */
  const dailyPlayRef = useRef<TodaysPuzzle | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);
  const [questDone, setQuestDone] = useState(false);
  const [questStar, setQuestStar] = useState<Star | null>(null);
  const [hinted, setHinted] = useState(false);
  /** A review in play: the two quests of one island, and how each went. */
  const [review, setReview] = useState<ReviewRun | null>(null);
  const reviewRef = useRef(review);
  const [masteryMoment, setMasteryMoment] = useState<Moment | null>(null);
  const momentTimer = useRef(createDelayed());
  useEffect(() => () => momentTimer.current.cancel(), []);
  const codeRef = useRef(code);
  codeRef.current = code;
  const questRef = useRef(quest);
  questRef.current = quest;

  /* Games: the running program stays alive so WHEN handlers can answer key presses. */
  const [logoKeys, setGameKeys] = useState<GameKey[]>([]);
  const [gameTicks, setGameTicks] = useState(false);
  const sessionRef = useRef<GameSession | null>(null);
  const sessionCodeRef = useRef('');
  const pressingRef = useRef(false);
  const endGame = useCallback(() => {
    sessionRef.current = null;
    setGameKeys([]);
    setGameTicks(false);
  }, []);

  /* Python: real Python in a locked box. Its runs never earn rewards or finish quests (see lastRunRef and onStatus). */
  const py = usePythonRun({
    stageRef,
    logo: code,
    docKey: project?.slug ?? 'draft',
    locked: quest !== null,
    setBubble,
    onStart: () => {
      lastRunRef.current = null;
      endGame();
      setPrints([]);
    },
  });
  const gameKeys = py.active ? py.gameKeys : logoKeys;

  const owned = project?.editKey != null;
  const dirty = `${title}\n${code}` !== savedSnapshot;

  /** Blocks are a view of the Logo code; null when the code uses things blocks can't show. */
  const blockView = useMemo((): { ok: true; blocks: Block[] } | { ok: false; reason: string } => {
    if (!code.trim()) return { ok: true, blocks: [] };
    const parsed = check(code);
    if (!parsed.ok) return { ok: false, reason: parsed.problem.message };
    return toBlocks(parsed.program);
  }, [code]);

  /** Replace the whole program (AI answers, quest starters, blocks) in whichever editor is showing. */
  const replaceCode = useCallback((next: string) => {
    if (next !== codeRef.current) undoStack.current = [...undoStack.current, codeRef.current].slice(-30);
    setCode(next);
    editorRef.current?.replaceAll(next);
  }, []);

  // Read the turtle's messages aloud (on by default for Little Turtles).
  useEffect(() => {
    readAloud.speak(bubble.text);
    // Speak only when the message changes, not when the speak function is recreated.
  }, [bubble.text]);

  // A mood is a reaction, not a state: it fades back to a calm face after a few seconds.
  useEffect(() => {
    setMoodLive(true);
    const id = window.setTimeout(() => setMoodLive(false), 5000);
    return () => window.clearTimeout(id);
  }, [bubble]);
  const mood: GioMood = asking || explaining || tutor.loading ? 'thinking' : moodLive ? moodFor(bubble) : 'idle';

  // Keep unsaved work safe in this browser: new work in the draft, edits of a saved drawing until they are saved.
  useEffect(() => {
    if (!project) local.saveDraft(title, code);
    else if (`${title}\n${code}` !== savedSnapshot) local.saveUnsaved(project.slug, title, code);
    else local.clearUnsaved(project.slug);
  }, [project, title, code, savedSnapshot]);

  useEffect(() => {
    stageRef.current?.setSpeed(speed);
  }, [speed]);

  const run = useCallback((source: string) => {
    py.release();
    setPrints([]);
    editorRef.current?.setProblemLine(null);
    pressingRef.current = false;
    const res = start(source);
    sessionRef.current = res.ok && (res.session.keys.length || res.session.ticks) && !res.session.isOver() ? res.session : null;
    sessionCodeRef.current = source;
    setGameKeys(sessionRef.current ? sessionRef.current.keys : []);
    setGameTicks(sessionRef.current?.ticks ?? false);
    if (!res.ok) {
      lastRunRef.current = null;
      failedCodeRef.current = source;
      editorRef.current?.setProblemLine(res.problem.line);
      setBubble({ kind: 'problem', text: res.problem.message, line: res.problem.line });
      if (res.partial) {
        stageRef.current?.load(res.partial);
        stageRef.current?.finish();
      }
      return;
    }
    const checked = check(source);
    lastRunRef.current = runSignals(source, !borrowedRef.current.has(source.trim()), res.result.events, checked.ok ? features(checked.program) : []);
    runCountRef.current += 1;
    if (sessionRef.current) {
      // Let the arrow keys reach the game instead of the code editor.
      (document.activeElement as HTMLElement | null)?.blur?.();
      setBubble({ kind: 'info', text: sessionRef.current.keys.length ? 'Game on! Press the arrow keys to play.' : 'Game on! Watch it go.' });
      stageRef.current?.load(res.result);
      stageRef.current?.play();
      return;
    }
    if (!res.result.events.length) {
      lastRunRef.current = null;
      setBubble({ kind: 'info', text: 'There are no commands for me yet. Add one, then press Run.' });
      stageRef.current?.reset();
      return;
    }
    setBubble({ kind: 'info', text: pickLine(LINES[modeRef.current].runStart, runCountRef.current) });
    stageRef.current?.load(res.result);
    stageRef.current?.play();
  }, []);

  // Opening a shared link plays the drawing, so friends see it come to life.
  useEffect(() => {
    if (initial.slug && initial.code.trim()) run(initial.code);
  }, [initial, run]);

  // Editing the code ends the game, so key presses never run old code.
  useEffect(() => {
    if (sessionRef.current && code !== sessionCodeRef.current) endGame();
  }, [code, endGame]);

  const pressKey = useCallback((key: GameKey) => {
    if (py.activeRef.current) {
      void py.pressKey(key);
      return;
    }
    const session = sessionRef.current;
    if (!session || session.isOver()) return;
    if (key === 'TICK' ? !session.ticks : !session.keys.includes(key)) return;
    const r = press(session, key);
    if (r.events.length) {
      pressingRef.current = true;
      stageRef.current?.appendEvents(r.events);
    }
    if (!r.ok) {
      editorRef.current?.setProblemLine(r.problem.line);
      setBubble({ kind: 'problem', text: r.problem.message, line: r.problem.line });
    }
  }, []);

  // The game clock: WHEN "tick runs 10 times a second. A tick is skipped if the turtle is still catching up.
  useEffect(() => {
    if (!gameTicks) return;
    const id = window.setInterval(() => {
      if ((stageRef.current?.pending() ?? 0) > 40) return;
      pressKey('TICK');
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [gameTicks, pressKey]);

  const onGameOver = useCallback(() => {
    endGame();
    setBubble({ kind: 'success', text: 'Game over! Press Run to play again.' });
  }, [endGame]);

  useEffect(() => {
    if (!gameKeys.length) return;
    const map: Record<string, GameKey> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ' ': 'SPACE' };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || el.closest('.cm-editor') || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const key = map[e.key];
      if (!key || !gameKeys.includes(key)) return;
      e.preventDefault();
      pressKey(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameKeys, pressKey]);

  /* ---------------- first win ---------------- */

  const { phaseRef: firstWinPhase, end: endFirstWin, showYours: showFirstWinYours } = firstWin;

  /** Skip, Done, asking for a drawing, starting a quest or clearing the stage all end the first win for good. */
  const finishFirstWin = useCallback(() => {
    if (firstWinPhase.current === 'off') return;
    markFirstWinShown(modeRef.current);
    endFirstWin();
  }, [firstWinPhase, endFirstWin]);

  /** The one big button: the turtle draws a star. The program is borrowed, so it earns nothing. */
  const startFirstWin = () => {
    markFirstWinShown(mode);
    const program = firstWinProgram(mode, DEFAULT_FIRST_COLOUR);
    borrowedRef.current.add(program.trim());
    firstWin.setColour(DEFAULT_FIRST_COLOUR);
    firstWin.begin();
    if (little) setSpeed('turtle');
    replaceCode(program);
    run(program);
    setBubble({ kind: 'info', text: FIRST_WIN_TEXT[mode].drawing });
  };

  /** A colour the child picked is the child's own change, so it is credited by the normal rewards path. */
  const pickFirstColour = (colour: BlockColour) => {
    const program = firstWinProgram(mode, colour);
    borrowedRef.current.delete(program.trim());
    firstWin.setColour(colour);
    replaceCode(program);
    run(program);
  };

  const skipFirstWin = () => {
    finishFirstWin();
    setBubble(WELCOME[mode]);
  };

  const askAfterFirstWin = () => {
    if (little) {
      setAskOpen(true);
      window.setTimeout(() => document.getElementById('ask-input')?.focus(), 60);
    }
    else editorRef.current?.focus();
  };

  /* ---------------- quests ---------------- */

  const setReviewRun = (r: ReviewRun | null) => {
    reviewRef.current = r;
    setReview(r);
  };

  const startQuest = (q: Quest, inReview = false) => {
    finishFirstWin();
    momentTimer.current.cancel();
    skill.questStarted();
    setQuestsOpen(false);
    setMasteryMoment(null);
    if (!inReview) setReviewRun(null);
    help.reset();
    setHinted(false);
    setQuestStar(null);
    setQuest(q);
    setQuestDone(false);
    setQuestFeedback(null);
    tutor.reset();
    if (q.starter?.trim()) borrowedRef.current.add(q.starter.trim());
    replaceCode(q.starter ?? '');
    endGame();
    stageRef.current?.reset();
    const target = q.target ? playWithPresses(q.target, q.presses) : null;
    py.release();
    stageRef.current?.setGuide(target?.ok ? target.result : null);
    setBubble({ kind: 'info', text: q.starter ? 'This code has a bug. Press Run to see what goes wrong!' : q.goal });
  };

  const leaveQuest = () => {
    momentTimer.current.cancel();
    skill.stop();
    setReviewRun(null);
    tutor.reset();
    setQuest(null);
    setQuestFeedback(null);
    stageRef.current?.setGuide(null);
    setBubble(WELCOME[mode]);
  };

  /** Follow the path: the next quest, a review visit, or the end of the map. */
  const goTo = (stop: NextStop) => {
    if (stop.kind === 'review') return startReview(stop.islandKey);
    const next = stop.kind === 'done' ? undefined : progress.quests.find((q) => q.id === stop.questId);
    if (next) startQuest(next);
    else {
      leaveQuest();
      toast.show({ text: 'You sailed every island! Amazing!' }, 6000);
    }
  };

  /** A review visits two quests of a sailed island. It is quiet and optional, and never locks anything. */
  const startReview = (islandKey: string) => {
    const ids = progress.reviewPlan(islandKey);
    const first = progress.quests.find((q) => q.id === ids[0]);
    if (!first) return;
    setReviewRun({ islandKey, ids, index: 0, results: [] });
    startQuest(first, true);
  };

  /** Start a skill check: its challenges play as ordinary quests, but no star, clear or review is recorded for them. */
  const startSkillCheck = (key: string) => {
    const first = skill.begin(key, progress.skillCheck(key));
    const q = first ? progress.quests.find((x) => x.id === first) : undefined;
    if (q) startQuest(q);
    else skill.stop();
  };

  const nextQuest = () => {
    const challenge = skill.advance();
    const upNext = challenge ? progress.quests.find((x) => x.id === challenge) : undefined;
    if (upNext) return startQuest(upNext);
    const r = reviewRef.current;
    if (!r) return goTo(progress.nextStop());
    const following = progress.quests.find((q) => q.id === r.ids[r.index + 1]);
    if (following) {
      setReviewRun({ ...r, index: r.index + 1 });
      return startQuest(following, true);
    }
    progress.finishReview(r.islandKey, r.results);
    const helped = r.results.some((x) => x.helped);
    leaveQuest();
    setMasteryMoment({ kind: 'review', islandKey: r.islandKey, helped });
  };
  /** Count a finished run toward rewards, but only when the child wrote the code. */
  const creditRun = useCallback((): { earned: Earned; run: RunSignals | null } => {
    const run = lastRunRef.current;
    lastRunRef.current = null;
    if (!run?.credited) return { earned: NOTHING, run };
    let earned = record({ kind: 'run-ok', features: run.features, colours: run.colours, drewLines: run.drewLines });
    const failed = failedCodeRef.current;
    if (failed !== null && failed !== run.code) {
      failedCodeRef.current = null;
      earned = mergeEarned(earned, record({ kind: 'bug-fixed' }));
    }
    return { earned, run };
  }, [record]);

  const checkActiveQuest = useCallback(
    (earned: Earned, run: RunSignals | null) => {
      const q = questRef.current;
      if (!q) return;
      const result = checkQuest(q, codeRef.current);
      setQuestFeedback(result.message);
      if (!result.pass) {
        setFriendQueue((f) => [...f, ...earned.newFriends]);
        setBubble(hasEarned(earned) ? { kind: 'info', text: announce(result.message, earned), mood: 'cheer' } : { kind: 'info', text: result.message });
        const names = stickerNames(earned);
        if (names.length) toast.show({ text: `New sticker: ${names.join(' and ')}!` }, 5000);
        return;
      }
      setQuestDone(true);
      if (q.id.startsWith('daily-')) {
        // The Daily Turtle Puzzle: its result stays in this browser and never touches quest progress, badges or the map.
        const today = dailyPlayRef.current ?? todaysPuzzle(q.audience);
        const saved = recordDaily(today.number, q.audience, commandsUsed(codeRef.current) ?? 1, today.par);
        setFriendQueue((f) => [...f, ...earned.newFriends]);
        haptic('win');
        setBubble({ kind: 'success', text: FUN_TEXT.dailyBubbleSolved, mood: 'cheer' });
        momentTimer.current.schedule(() => setDaily({ today, result: saved }), 800);
        return;
      }
      const helped = help.used();
      if (skill.isActive(q.id)) {
        // A skill check challenge: no star, clear, review or sticker for the quest. Only the verdict counts.
        setFriendQueue((f) => [...f, ...earned.newFriends]);
        const step = skill.solved(q.id, helped);
        if (step?.kind === 'end') {
          const passed = step.passed ? progress.passSkillCheck(step.targetKey) : null;
          if (passed?.masterEarned) record({ kind: 'logo-master' });
          const moment: Moment = passed?.masterEarned ? { kind: 'master', islandKey: step.targetKey } : { kind: 'skill', islandKey: step.targetKey, passed: step.passed };
          setBubble({ kind: 'success', text: step.passed ? 'Skill check passed!' : 'Not yet. You used help, so this check cannot be passed this time.' });
          momentTimer.current.schedule(() => setMasteryMoment(moment), 800);
        } else setBubble({ kind: 'success', text: 'Challenge solved! Press Next challenge when you are ready.' });
        return;
      }
      const { newBadge, star, unitMastered, islandSailed, opened, masterEarned } = progress.complete(q.id, helped);
      if (masterEarned) record({ kind: 'logo-master' });
      setQuestStar(star);
      haptic('win');
      const island = islandOf(q.id);
      const visit = reviewRef.current;
      if (visit) setReviewRun({ ...visit, results: [...visit.results.filter((x) => x.questId !== q.id), { questId: q.id, helped }] });
      else if (island && (islandSailed || unitMastered)) {
        // Let the child see the finished drawing before the celebration arrives.
        const moment: Moment = masterEarned ? { kind: 'master', islandKey: island.key } : islandSailed ? { kind: 'island', islandKey: island.key, opened, badge: newBadge } : { kind: 'unit', islandKey: island.key, unitIndex: placeOf(q.id)?.unitIndex ?? 0 };
        momentTimer.current.schedule(() => setMasteryMoment(moment), 800);
      }
      const credited = run?.credited === true;
      const all = mergeEarned(
        earned,
        record({ kind: 'quest-done', questId: q.id, features: credited ? run.features : [], colours: credited ? run.colours : 0, newBadge }),
      );
      setFriendQueue((f) => [...f, ...all.newFriends]);
      const starLine = star === 'clean' ? ' Gold star!' : ' Silver star. Try it again without a hint for gold.';
      const headline = masterEarned ? 'You are a Logo Master!' : newBadge ? `You earned the ${CONCEPTS[newBadge].badge} badge!` : islandSailed && island ? `You sailed ${island.name}!` : unitMastered ? 'Unit mastered!' : 'Quest complete! You did it!';
      const base = `${headline}${starLine}`;
      setBubble({ kind: 'success', text: announce(base, all, newBadge), mood: hasEarned(all) ? 'cheer' : undefined });
      const names = stickerNames(all, newBadge);
      toast.show({ text: newBadge ? `New badge: ${CONCEPTS[newBadge].badge}!${names.length ? ` New sticker: ${names.join(' and ')}!` : ''}` : names.length ? `New sticker: ${names.join(' and ')}!` : `Quest complete: ${q.title}` }, 5000);
    },
    [progress, record, toast],
  );

  /* ---------------- player ---------------- */

  const onStatus = useCallback(
    (s: PlayerStatus) => {
      setStatus(s);
      reportPlayerStatus(s);
      if (py.handleStatus(s)) return;
      // A finished key press in a game is not the end of the program.
      if (s === 'done' && pressingRef.current) return;
      if (s === 'done' && lastRunRef.current && stageRef.current?.events().some((e) => e.type === 'frame')) {
        toast.show({ text: 'Your movie is ready! Use Picture, then Movie, to keep it.' }, 6000);
      }
      if (s === 'done') {
        const { earned, run } = creditRun();
        if (questRef.current) checkActiveQuest(earned, run);
        else {
          setFriendQueue((f) => [...f, ...earned.newFriends]);
          const cheer = hasEarned(earned);
          // A game keeps its "Game on!" message while it is being played, unless something new arrived.
          if (!sessionRef.current || cheer) {
            const base = sessionRef.current ? 'Your game works!' : pickLine(LINES[modeRef.current].success, runCountRef.current);
            setBubble((b) => (b.kind === 'problem' ? b : { kind: 'success', text: announce(base, earned), mood: cheer ? 'cheer' : undefined }));
          }
          const names = stickerNames(earned);
          if (names.length) toast.show({ text: `New sticker: ${names.join(' and ')}!` }, 5000);
        }
        // The first star is finished: invite the child to make it their own.
        if (firstWinPhase.current === 'drawing') {
          showFirstWinYours();
          setBubble({ kind: 'success', text: FIRST_WIN_TEXT[modeRef.current].yours, mood: 'cheer' });
        }
      }
      if (s === 'paused') setBubble((b) => (b.kind === 'problem' ? b : { kind: 'info', text: 'Paused. Press Step to go one command at a time.' }));
    },
    [checkActiveQuest, creditRun, toast, firstWinPhase, showFirstWinYours],
  );

  const onLine = useCallback((line: number | null) => {
    if (py.activeRef.current) return py.setLine(line);
    editorRef.current?.setRunningLine(line);
    setRunningLine(line);
  }, []);
  const onPrint = useCallback((text: string) => setPrints((p) => [...p, text].slice(-50)), []);

  /** The Python tab is open and no quest is: the big buttons run Python instead of Logo. */
  const pythonOpen = codeTab === 'python' && !little && !quest;
  const onRunPress = () => {
    if (status === 'playing') return stageRef.current?.pause();
    if (status === 'paused') return stageRef.current?.play();
    if (pythonOpen) void py.run();
    else run(code);
  };

  const onStep = () => {
    if (pythonOpen) {
      if (status === 'idle' || status === 'done') void py.run(true);
      else stageRef.current?.step();
      return;
    }
    py.release();
    if (status === 'idle' || status === 'done') {
      setPrints([]);
      editorRef.current?.setProblemLine(null);
      const res = execute(code);
      if (!res.ok) return run(code);
      stageRef.current?.load(res.result);
    }
    setBubble({ kind: 'info', text: little ? 'One step at a time. Watch the glowing block!' : 'One step at a time. The yellow line shows what I\u2019m doing.' });
    stageRef.current?.step();
  };

  const onReset = () => {
    py.stop();
    finishFirstWin();
    endGame();
    sound.stop();
    stageRef.current?.reset();
    editorRef.current?.setProblemLine(null);
    setPrints([]);
    setBubble({ kind: 'info', text: 'All clean! Press Run when you\u2019re ready.' });
  };

  /* ---------------- voice and typed commands ---------------- */

  const undo = () => {
    const previous = undoStack.current.pop();
    if (previous === undefined) {
      setBubble({ kind: 'info', text: 'There is nothing to undo.' });
      return;
    }
    setCode(previous);
    editorRef.current?.replaceAll(previous);
    setBubble({ kind: 'info', text: 'Undone!' });
  };

  const SLOWER: Record<Speed, Speed> = { rocket: 'rabbit', rabbit: 'turtle', turtle: 'turtle' };
  const FASTER: Record<Speed, Speed> = { turtle: 'rabbit', rabbit: 'rocket', rocket: 'rocket' };

  /** Short spoken (or typed) commands control the app; everything else is a drawing request. */
  const doCommand = (command: VoiceCommand) => {
    switch (command) {
      case 'run':
        if (status === 'paused') stageRef.current?.play();
        else run(codeRef.current);
        return;
      case 'pause':
        stageRef.current?.pause();
        return;
      case 'step':
        onStep();
        return;
      case 'slower':
        setSpeed((s) => SLOWER[s]);
        setBubble({ kind: 'info', text: 'Okay, I\u2019ll go slower.' });
        return;
      case 'faster':
        setSpeed((s) => FASTER[s]);
        setBubble({ kind: 'info', text: 'Okay, I\u2019ll go faster!' });
        return;
      case 'zoom':
        setSpeed('rocket');
        setBubble({ kind: 'info', text: 'Zoom! Super fast.' });
        return;
      case 'explain':
        void explain();
        return;
      case 'save':
        void save();
        return;
      case 'clear':
        onReset();
        return;
      case 'new':
        startNew();
        return;
      case 'undo':
        undo();
        return;
      case 'quests':
        setQuestsOpen(true);
        return;
      case 'hint':
        void askForHint();
        return;
      case 'quiet':
        readAloud.setEnabled(false);
        return;
      case 'talk':
        readAloud.setEnabled(true);
        readAloud.speak(bubble.text, true);
        return;
    }
  };

  /* ---------------- AI ---------------- */

  const ask = async (prompt: string): Promise<boolean> => {
    finishFirstWin();
    const command = parseVoiceCommand(prompt);
    if (command) {
      doCommand(command);
      return true;
    }
    setAsking(true);
    setBubble({ kind: 'info', text: 'Hmm, let me think about how to draw that…' });
    const before = code;
    try {
      const { code: aiCode } = await api.askTurtle(prompt, code.trim() ? code : undefined, style);
      const suggested = titleFromCode(aiCode);
      const next = little ? withoutComments(aiCode) : aiCode;
      borrowedRef.current.add(next.trim());
      replaceCode(next);
      if (suggested && (title === DEFAULT_TITLE || !project)) setTitle(suggested);
      run(next);
      if (before.trim()) {
        toast.show({ text: 'I changed your drawing.', action: { label: 'Undo', run: undo } }, 6000);
      }
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.redirect) {
        setBubble({ kind: 'info', text: err.message, mood: 'calm' });
        toast.show({ text: "Let's draw something else!" });
      } else {
        setBubble({ kind: 'problem', text: err instanceof Error ? err.message : 'Something went wrong. Try again?' });
      }
      return false;
    } finally {
      setAsking(false);
    }
  };

  /** "I'm stuck": one hint at a time. Hints never touch quest progress, badges or stickers. */
  const askForHint = async () => {
    if (tutor.loading) return;
    const q = questRef.current;
    if (q && !questDone) {
      help.note('hint');
      setHinted(true);
    }
    const got = await tutor.ask({ code: codeRef.current, style, quest: questRef.current });
    if (got) readAloud.speak(got.hint.text);
  };

  /** "Show me more": step forward to a hint that is already here, or ask for the next one. */
  const moreHint = () => {
    const next = (tutor.shown + 1) as 1 | 2 | 3;
    if (tutor.ladder?.hints[next]) tutor.show(next);
    else void askForHint();
  };

  // Turtle Coders see the line the interpreter found at the Look step, until the card moves on or closes.
  const lookLine = !little && tutor.open && tutor.shown === 2 ? tutor.ladder?.hints[2]?.line : undefined;
  useEffect(() => {
    if (lookLine === undefined) return;
    editorRef.current?.setProblemLine(lookLine);
    return () => editorRef.current?.setProblemLine(null);
  }, [lookLine]);

  const explain = async () => {
    if (!code.trim()) {
      setBubble({ kind: 'info', text: little ? 'Add some blocks first, then I can tell you what they do!' : 'Write some code first, then I can explain it.' });
      return;
    }
    if (quest && !questDone) {
      help.note('explain');
      if (skill.isActive(quest.id)) setHinted(true);
    }
    setExplaining(true);
    setBubble({ kind: 'info', text: 'Let me look at your code…' });
    try {
      const { text } = await api.explain(code, style);
      setBubble({ kind: 'info', text });
    } catch (err) {
      const redirect = err instanceof ApiError && err.redirect;
      setBubble({ kind: redirect ? 'info' : 'problem', text: err instanceof Error ? err.message : 'I could not explain that right now.', mood: redirect ? 'calm' : undefined });
    } finally {
      setExplaining(false);
    }
  };

  /* ---------------- save & share ---------------- */

  const save = async (): Promise<string | null> => {
    const cleanTitle = title.trim() || DEFAULT_TITLE;
    setSaving(true);
    try {
      if (project && owned) {
        await api.updateProject(project.slug, project.editKey!, { title: cleanTitle, code });
        setSavedSnapshot(`${cleanTitle}\n${code}`);
        toast.show({ text: 'Saved!' });
        return project.slug;
      }
      const created = await api.createProject(cleanTitle, code);
      local.rememberEditKey(created.slug, created.editKey);
      local.clearDraft();
      setProject({ slug: created.slug, editKey: created.editKey });
      setSavedSnapshot(`${cleanTitle}\n${code}`);
      // Update the address bar in place so the drawing on stage isn't reloaded.
      window.history.replaceState(null, '', `/p/${created.slug}`);
      toast.show({ text: project ? 'Saved your own copy!' : 'Saved!' });
      return created.slug;
    } catch (err) {
      toast.show({ text: err instanceof Error ? err.message : 'Could not save. Try again?' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const share = async () => {
    const slug = dirty || !project ? await save() : project.slug;
    if (!slug) return;
    const url = `${window.location.origin}/p/${slug}`;
    try {
      if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: `${title} · GIO`, text: 'Look what I drew with code!', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show({ text: 'Link copied! Send it to a friend.' });
    } catch {
      toast.show({ text: `Your link: ${url}` }, 8000);
    }
  };

  const exportPicture = () => {
    const url = stageRef.current?.toPNG();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(title, 'png');
    a.click();
    toast.show({ text: 'Saved your picture!' });
  };
  /** One tap: a WhatsApp-ready sticker. Shared with the phone's share menu where files can be shared, saved otherwise. */
  const makeWhatsAppSticker = async () => {
    const events = stageRef.current?.events();
    if (!events) return;
    try {
      const sticker = await makeSticker(events);
      if (!sticker) return;
      const name = fileName(`${title || DEFAULT_TITLE} ${FUN_TEXT.stickerFileTitle}`, sticker.extension);
      const file = new File([sticker.blob], name, { type: sticker.blob.type });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          toast.show({ text: FUN_TEXT.stickerShared });
          return;
        } catch (err) {
          // Closing the share menu is not a problem. Any other failure falls back to a download.
          if (err instanceof DOMException && err.name === 'AbortError') return;
        }
      }
      const url = URL.createObjectURL(sticker.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.show({ text: FUN_TEXT.stickerSaved });
    } catch {
      toast.show({ text: FUN_TEXT.stickerFailed });
    }
  };
  const exportSvg = () => {
    const svg = toSVG(stageRef.current?.events() ?? [], { title: title || 'GIO drawing' });
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(title, 'svg');
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.show({ text: 'Saved your drawing file!' });
  };
  const openMovie = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setMovie({ events: [...stage.events()], background: stage.background() });
  };
  const openDaily = () => {
    const today = todaysPuzzle(mode);
    setDaily({ today, result: savedResult(today.number, mode) });
  };
  const playDaily = () => {
    if (!daily) return;
    dailyPlayRef.current = daily.today;
    setDaily(null);
    startQuest(daily.today.puzzle);
  };
  const dailySolved = useMemo(() => savedResult(todaysPuzzle(mode).number, mode) !== null, [mode, daily, questDone]);
  const openColouring = () => {
    const stage = stageRef.current;
    if (stage) setColouring([...stage.events()]);
  };

  const startNew = () => {
    tutor.reset();
    local.clearDraft();
    if (project) {
      window.history.pushState(null, '', '/');
      setProject(null);
      setSavedSnapshot('');
    }
    if (quest) leaveQuest();
    replaceCode('');
    setTitle(DEFAULT_TITLE);
    onReset();
    setBubble(WELCOME[mode]);
  };

  const win = useWindowClass();
  useKeyboardInset();
  const [editorFocused, setEditorFocused] = useState(false);
  const compact = win.widthClass === 'compact';
  const [askOpen, setAskOpen] = useState(false);
  const paneRef = useRef<HTMLElement>(null);
  const focus = useFocusMode(paneRef, gameKeys.length > 0, win.widthClass);
  const askAndFold = async (prompt: string): Promise<boolean> => {
    const done = await ask(prompt);
    if (done) setAskOpen(false);
    return done;
  };

  const playing = status === 'playing';
  const sailedCount = progress.islands.filter((i) => i.sailed).length;

  /* ---------------- render ---------------- */

  const codePanel = little ? (
    <section className="studio-code panel flex flex-col" aria-labelledby="code-title">
      <div className="panel-header">
        <h2 id="code-title" className="text-[20px] font-black">
          My blocks
        </h2>
        <button type="button" className="btn btn-ghost min-h-[var(--touch)] px-3 text-[14px]" onClick={() => setShowLogoUnderBlocks((v) => !v)} aria-pressed={showLogoUnderBlocks}>
          {showLogoUnderBlocks ? 'Hide the code' : 'See the code'}
        </button>
      </div>
      {showLogoUnderBlocks && (
        <pre className="m-0 px-5 py-3 max-h-[160px] overflow-auto bg-paper-2 border-b border-line font-mono text-[15px] font-bold text-[#0b7a4f]" aria-label="Your blocks as Logo code">
          {code.trim() || '(no code yet)'}
        </pre>
      )}
      <div className="flex-1 min-h-0">
        {blockView.ok ? (
          <Suspense fallback={<EditorSkeleton />}>
            <BlocksEditor blocks={blockView.blocks} runningLine={runningLine} onChange={(b) => replaceCode(blocksToLogo(b))} />
          </Suspense>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="m-0 text-[20px] font-black">This drawing uses big-kid code</p>
            <p className="m-0 text-[16px] font-semibold text-ink-2">It can't be shown as blocks because {blockView.reason}. You can still press Run to watch it!</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={startNew}>
                Start with blocks
              </button>
              <button type="button" className="btn btn-quiet" onClick={chooseAgain}>
                Switch to {MODE_LABEL.coder}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  ) : (
    <section className="studio-code panel flex flex-col" aria-labelledby="code-title">
      <div className="panel-header flex-wrap">
        <h2 id="code-title" className="text-[18px] font-black">
          Your code
        </h2>
        <div className="segmented" role="tablist" aria-label="Code language">
          {CODE_TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={codeTab === t.id} aria-controls={`panel-${t.id}`} onClick={() => setCodeTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div id="panel-logo" role="tabpanel" aria-labelledby="tab-logo" className="flex-1 min-h-[240px]" hidden={codeTab !== 'logo'}>
        <Suspense fallback={<EditorSkeleton />}>
          <LogoEditor ref={editorRef} initialCode={code} onChange={setCode} onRunShortcut={() => run(codeRef.current)} onFocusChange={setEditorFocused} />
        </Suspense>
      </div>
      {codeTab !== 'logo' && (
        <div id={`panel-${codeTab}`} role="tabpanel" aria-labelledby={`tab-${codeTab}`} className="flex-1 min-h-0">
          {codeTab === 'python' ? (
            <PythonPanel py={py} logo={code} logoRunningLine={runningLine} onCopied={() => toast.show({ text: 'Copied!' })} />
          ) : (
            <TranslatedCode language={codeTab} logo={code} runningLine={runningLine} onCopied={() => toast.show({ text: 'Copied!' })} />
          )}
        </div>
      )}
      {codeTab === 'logo' && <CommandShelf onInsert={(snippet) => editorRef.current?.insert(snippet)} />}
      <CommandKeyRow visible={codeTab === 'logo' && editorFocused && win.coarse} onKey={(k) => applyKey(k, editorRef.current, () => run(codeRef.current))} />
    </section>
  );

  return (
    <GoldenShellContext.Provider value={rewards.goldenShell}>
    <div className="studio-root min-h-full flex flex-col" data-game={gameKeys.length > 0}>
      <StudioHeader
        compact={compact}
        mode={mode}
        title={title}
        onTitle={setTitle}
        onHome={startNew}
        onChooseAgain={chooseAgain}
        onGarden={() => setGardenOpen(true)}
        onMap={() => setQuestsOpen(true)}
        onPlay={() => navigate('/adventure')}
        sailed={sailedCount}
        islands={progress.islands.length}
        reviewDue={Boolean(progress.reviewDue)}
        saveLabel={project && !owned ? 'Save a copy' : 'Save'}
        saveDisabled={saving || (!dirty && owned)}
        onSave={() => void save()}
        sharing={saving}
        onShare={() => void share()}
        onNew={startNew}
      />

      <main className="studio-main flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5">
        {skill.run && quest && (
          <SkillCheckBanner
            stageName={islandByKey(skill.run.targetKey)?.name ?? 'the stage'}
            position={skill.run.index + 1}
            total={skill.run.plan.length}
            helped={hinted}
            onStop={() => {
              leaveQuest();
              toast.show({ text: 'Skill check stopped. Nothing was lost.' });
            }}
          />
        )}
        {quest ? (
          <QuestCard quest={quest} done={questDone} feedback={questFeedback} star={questStar} hinted={hinted && !skill.run} review={review ? { index: review.index, total: review.ids.length } : null} eyebrow={quest.id.startsWith('daily-') ? FUN_TEXT.dailyEyebrow((dailyPlayRef.current ?? todaysPuzzle(mode)).number) : undefined} nextLabel={quest.id.startsWith('daily-') ? FUN_TEXT.dailySeeResult : skill.run ? 'Next challenge' : review ? (review.index + 1 < review.ids.length ? 'Next review quest' : 'Finish review') : 'Next quest'} onHint={() => void askForHint()} onNext={quest.id.startsWith('daily-') ? openDaily : nextQuest} onLeave={leaveQuest} onVoice={(text) => {
            const command = parseVoiceCommand(text);
            if (command) doCommand(command);
            else setBubble({ kind: 'info', text: 'In a quest you write the code yourself! You can say run, hint, explain or step.' });
          }} />
        ) : (
          <AskFold widthClass={win.widthClass} layout={win.layout} open={askOpen} onOpen={setAskOpen} label={little ? 'Tell me what to draw!' : 'Describe a drawing and I will write the Logo'}>
            <AskTurtle mode={mode} hasCode={code.trim().length > 0} busy={asking} onAsk={askAndFold} />
          </AskFold>
        )}

        <div className="studio-shell">
          {codePanel}

          <section ref={paneRef} data-focus={focus.active} className="studio-stage-pane panel p-4 sm:p-5 flex flex-col gap-4" aria-label="Turtle stage">
            {/* The square stage is sized in CSS from its pane, so the Run button stays on screen. */}
            <div className="studio-stage-slot">
            <div className="studio-stage-box relative">
              <Stage ref={stageRef} onLine={onLine} onPrint={onPrint} onStatus={onStatus} onGameOver={onGameOver} mood={mood} stickers={rewards.shell} />
              <FocusToggle focus={focus} />
              <FocusOffer focus={focus} />
              {firstWin.phase === 'offer' && <FirstWinOffer mode={mode} onStart={startFirstWin} onSkip={skipFirstWin} />}
            </div>
            </div>
            {firstWin.phase === 'yours' && (
              <FirstWinYours mode={mode} colour={firstWin.colour} onPick={pickFirstColour} onAsk={askAfterFirstWin} onDone={finishFirstWin} />
            )}

            <div className="studio-controls flex flex-wrap items-center justify-center gap-3">
              {(!compact || focus.active) && (
              <>
              <button type="button" className={`btn btn-lg ${playing ? 'btn-stop' : 'btn-primary'} min-w-[150px]`} onClick={onRunPress}>
                {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
                {playing ? 'Pause' : status === 'paused' ? 'Keep going' : 'Run'}
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={onStep} disabled={playing}>
                <StepIcon /> <span className="step-label">Step</span>
              </button>
              </>
              )}
              <div className="segmented studio-speed" role="radiogroup" aria-label="Turtle speed">
                {SPEEDS.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={speed === s.id} onClick={() => setSpeed(s.id)}>
                    <span className="inline-flex items-center gap-1.5">
                      <s.Icon size={18} /> <span className="speed-label">{s.label}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="studio-secondary flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-icon" onClick={onReset} aria-label="Clear the drawing" title="Clear the drawing">
                  <ResetIcon />
                </button>
                <SoundToggle />
                <ExportMenu empty={!hasDrawing(stageRef.current?.events() ?? [])} little={little} onPicture={exportPicture} onMovie={openMovie} onDrawingFile={exportSvg} onColouring={openColouring} onSticker={makeWhatsAppSticker} onDaily={openDaily} dailySolved={dailySolved} />
              </div>
            </div>

            {gameKeys.length > 0 && <GamePad keys={gameKeys} onPress={pressKey} />}

            <div className="studio-extras flex flex-col gap-2">
              <TurtleBubble message={bubble} mood={mood} stickers={rewards.shell} onShowLine={(line) => editorRef.current?.setProblemLine(line)} />
              <HintCard
                open={tutor.open}
                loading={tutor.loading}
                error={tutor.error}
                notice={tutor.notice}
                ladder={tutor.ladder}
                shown={tutor.shown}
                little={little}
                questTip={quest?.hint}
                canSpeak={readAloud.supported}
                onMore={moreHint}
                onShow={tutor.show}
                onRetry={() => void askForHint()}
                onHear={(text) => readAloud.speak(text, true)}
                onClose={() => {
                  tutor.close();
                  stuckRef.current?.focus();
                }}
              />
              <div className="flex flex-wrap justify-end gap-2">
                {readAloud.supported && (
                  <button
                    type="button"
                    className="btn btn-quiet min-h-[48px]"
                    onClick={() => readAloud.setEnabled(!readAloud.enabled)}
                    aria-pressed={readAloud.enabled}
                    title={readAloud.enabled ? 'Stop reading messages aloud' : 'Read messages aloud'}
                  >
                    {readAloud.enabled ? <SpeakerIcon /> : <SpeakerOffIcon />} {readAloud.enabled ? 'Reading aloud' : 'Read aloud'}
                  </button>
                )}
                <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => void explain()} disabled={explaining || asking}>
                  <BulbIcon className="text-[#f4a72c]" /> {explaining ? 'Thinking…' : little ? 'What did I make?' : 'Explain my code'}
                </button>
                {!compact && (
                  <button ref={stuckRef} type="button" className="btn btn-quiet min-h-[48px]" onClick={() => void askForHint()} disabled={tutor.loading || asking || explaining}>
                    <HelpIcon className="text-[#e0861a]" /> I&rsquo;m stuck
                  </button>
                )}
              </div>
            </div>

            {prints.length > 0 && (
              <div className="studio-extras rounded-[20px] bg-paper-3 px-4 py-3" aria-label="Messages from PRINT">
                <span className="eyebrow">The turtle says</span>
                <ul className="mt-1 flex flex-col gap-0.5 font-mono text-[15px] font-bold text-ink">
                  {prints.map((p, k) => (
                    <li key={k}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        <footer className="studio-footer pt-2 pb-6 text-center text-[14px] font-semibold text-ink-3">
          <span className="studio-footer-note">GIO brings back Logo (1967), the language Seymour Papert and friends made so kids could learn by teaching a turtle.
          {!little && ' Its turtle still lives on in Python today.'}{' '}</span>
          <Link to="/privacy" className="inline-flex min-h-[48px] items-center px-2 underline underline-offset-4 font-extrabold">
            Privacy for parents
          </Link>
        </footer>
      </main>

      {compact && !focus.active && (
        <ActionDock
          status={status}
          onRun={onRunPress}
          onStep={onStep}
          onAsk={() => setAskOpen((v) => !v)}
          askOpen={askOpen}
          onStuck={() => void askForHint()}
          stuckRef={stuckRef}
          stuckDisabled={tutor.loading || asking || explaining}
        />
      )}
      <Suspense fallback={null}>
      {questsOpen && <AdventureMap
        open={questsOpen}
        mode={mode}
        islands={progress.islands}
        friends={rewards.friends}
        next={progress.nextStop()}
        reviewKey={progress.reviewDue}
        mood={mood}
        shell={rewards.shell}
        skillPlan={progress.skillCheck}
        certificate={progress.masterOn !== null}
        onSkip={startSkillCheck}
        onPlay={(id) => {
          const picked = progress.quests.find((q) => q.id === id);
          if (picked) startQuest(picked);
        }}
        onGo={() => goTo(progress.nextStop())}
        onReview={startReview}
        onGarden={() => {
          setQuestsOpen(false);
          setGardenOpen(true);
        }}
        onClose={() => setQuestsOpen(false)}
        renderGarden={() => (
          <Suspense fallback={null}>
            <GardenContent mode={mode} rewards={rewards} quests={progress.quests} completed={progress.completed} badges={progress.badges} onWear={wear} />
          </Suspense>
        )}
      />}
      </Suspense>
      <Suspense fallback={null}>
      {gardenOpen && <GardenSheet
        open={gardenOpen}
        mode={mode}
        rewards={rewards}
        quests={progress.quests}
        completed={progress.completed}
        badges={progress.badges}
        onWear={wear}
        onClose={() => setGardenOpen(false)}
      />}
      </Suspense>
      <Suspense fallback={null}>
      {friendQueue[0] && <FriendDialog key={friendQueue[0]} friend={friendById(friendQueue[0])} onClose={() => setFriendQueue((f) => f.slice(1))} />}
      {!friendQueue[0] && masteryMoment && (
        <MasteryMoment
          moment={masteryMoment}
          mode={mode}
          shell={rewards.shell}
          onContinue={() => {
            setMasteryMoment(null);
            goTo(progress.nextStop());
          }}
          onMap={() => {
            setMasteryMoment(null);
            setQuestsOpen(true);
          }}
          onClose={() => setMasteryMoment(null)}
          onCertificate={() => navigate('/certificate')}
          onGarden={() => {
            setMasteryMoment(null);
            setGardenOpen(true);
          }}
        />
      )}
      </Suspense>
      {movie && (
        <Suspense fallback={null}>
          <ReplayDialog
            events={movie.events}
            background={movie.background}
            title={title || 'My GIO drawing'}
            fileName={fileName(title, 'gif')}
            onSaved={() => toast.show({ text: 'Saved your movie!' })}
            onClose={() => setMovie(null)}
          />
        </Suspense>
      )}
      {colouring && (
        <Suspense fallback={null}>
          <ColouringDialog events={colouring} title={title || DEFAULT_TITLE} onClose={() => setColouring(null)} />
        </Suspense>
      )}
      {daily && (
        <Suspense fallback={null}>
          <DailyDialog today={daily.today} mode={mode} result={daily.result} onPlay={playDaily} onClose={() => setDaily(null)} />
        </Suspense>
      )}
      {toast.view}
    </div>
    </GoldenShellContext.Provider>
  );
}

function CenteredMessage({ title, text, action }: { title: string; text?: string; action?: { label: string; run(): void } }) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
        <Wordmark />
        <h1 className="text-[24px] font-black leading-tight">{title}</h1>
        {text && <p className="text-[16px] font-semibold text-ink-2">{text}</p>}
        {action && (
          <button type="button" className="btn btn-primary btn-lg" onClick={action.run}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
