import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { blocksToLogo, check, execute, press, start, toBlocks, type Block, type GameKey, type GameSession, type TargetLanguage, type TurtleEvent } from '../../logo/index.js';
import { TICK_MS } from '../../logo/primitives.js';
import { checkQuest, CONCEPTS, features, playWithPresses, type Quest } from '../../logo/quests.js';
import { api, ApiError, local, offlineMessage, slowMessage, type AssistantStyle } from '../api';
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
import { FirstWinOffer, FirstWinYours, firstWinText, useFirstWin } from '../components/FirstWin';
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
import { linesFor, pickLine, welcomeBackLine } from '../gio/lines';
import { conceptText, localizeQuest, localizeStage } from '../../i18n/content.js';
import { useLang, useT } from '../lang';
import { currentLang, problemText, problemText as questFeedbackText, tr } from '../lang-state';
import { moodFor, type GioMood } from '../gio/mood';
import { daysAway, localDateKey } from '../gio/rewards';
import type { LogoEditorHandle } from '../editor/LogoEditor';
import { CommandKeyRow, applyKey } from '../components/CommandKeyRow';
import { useKeyboardInset } from '../responsive/useKeyboardInset';
import { useMode, type AgeMode } from '../mode';
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

/** The English name of a new drawing. A new drawing gets the name in the child's language. */
const DEFAULT_TITLE = 'My drawing';
const defaultTitle = (): string => tr('studio.defaultTitle');
const isDefaultTitle = (title: string): boolean => title === DEFAULT_TITLE || title === defaultTitle();

const welcome = (mode: AgeMode): BubbleMessage => ({ kind: 'info', text: pickLine(linesFor(mode, currentLang()).greeting, 0) });

const SPEEDS: { id: Speed; Icon: typeof TurtleSpeedIcon }[] = [
  { id: 'turtle', Icon: TurtleSpeedIcon },
  { id: 'rabbit', Icon: RabbitSpeedIcon },
  { id: 'rocket', Icon: RocketSpeedIcon },
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
function EditorSkeleton() {
  const t = useT();
  return <div className="h-full min-h-[240px] bg-paper-2 animate-pulse" aria-busy="true" aria-label={t('studio.loadingEditor')} />;
}

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
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setLoadError(null);
    if (!routeSlug) {
      const draft = local.loadDraft();
      setLoaded({ title: draft?.title || defaultTitle(), code: draft?.code ?? '', slug: null, editKey: null });
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
        title={loadError === offlineMessage() || loadError === slowMessage() ? t('studio.load.needsNet') : t('studio.load.notFound')}
        text={loadError === 'Project not found' ? t('studio.load.badLink') : loadError}
        action={{ label: t('studio.load.startNew'), run: () => navigate('/') }}
      />
    );
  }
  if (!loaded) return <CenteredMessage title={t('studio.load.getting')} />;
  return <StudioView key={loaded.slug ?? 'new'} initial={loaded} />;
}

function StudioView({ initial }: { initial: Loaded }) {
  const { mode: chosenMode, chooseAgain } = useMode();
  const t = useT();
  const { lang } = useLang();
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
  const [bubble, setBubble] = useState<BubbleMessage>(initial.code ? { kind: 'info', text: tr('studio.pressRun') } : offerFirstWin ? { kind: 'info', text: firstWinText(mode, tr).offer } : cameBack ? { kind: 'info', text: welcomeBackLine(currentLang()) } : welcome(mode));
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
    if (!parsed.ok) return { ok: false, reason: problemText(parsed.problem) };
    return toBlocks(parsed.program);
  }, [code, lang]);

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
      setBubble({ kind: 'problem', text: problemText(res.problem), line: res.problem.line });
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
      setBubble({ kind: 'info', text: sessionRef.current.keys.length ? tr('studio.game.keys') : tr('studio.game.watch') });
      stageRef.current?.load(res.result);
      stageRef.current?.play();
      return;
    }
    if (!res.result.events.length) {
      lastRunRef.current = null;
      setBubble({ kind: 'info', text: tr('studio.noCommands') });
      stageRef.current?.reset();
      return;
    }
    setBubble({ kind: 'info', text: pickLine(linesFor(modeRef.current, currentLang()).runStart, runCountRef.current) });
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
      setBubble({ kind: 'problem', text: problemText(r.problem), line: r.problem.line });
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
    setBubble({ kind: 'success', text: tr('studio.gameOver') });
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
    setBubble({ kind: 'info', text: firstWinText(mode, tr).drawing });
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
    setBubble(welcome(mode));
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
    setBubble({ kind: 'info', text: q.starter ? tr('studio.questBug') : localizeQuest(q, currentLang()).goal });
  };

  const leaveQuest = () => {
    momentTimer.current.cancel();
    skill.stop();
    setReviewRun(null);
    tutor.reset();
    setQuest(null);
    setQuestFeedback(null);
    stageRef.current?.setGuide(null);
    setBubble(welcome(mode));
  };

  /** Follow the path: the next quest, a review visit, or the end of the map. */
  const goTo = (stop: NextStop) => {
    if (stop.kind === 'review') return startReview(stop.islandKey);
    const next = stop.kind === 'done' ? undefined : progress.quests.find((q) => q.id === stop.questId);
    if (next) startQuest(next);
    else {
      leaveQuest();
      toast.show({ text: tr('studio.allSailed') }, 6000);
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
      const feedback = result.pass ? tr('check.complete', { title: localizeQuest(q, currentLang()).title }) : questFeedbackText(result);
      setQuestFeedback(feedback);
      if (!result.pass) {
        setFriendQueue((f) => [...f, ...earned.newFriends]);
        setBubble(hasEarned(earned) ? { kind: 'info', text: announce(feedback, earned, null, currentLang()), mood: 'cheer' } : { kind: 'info', text: feedback });
        const names = stickerNames(earned, null, currentLang());
        if (names.length) toast.show({ text: tr('studio.newSticker', { names: names.join(tr('word.and')) }) }, 5000);
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
          setBubble({ kind: 'success', text: step.passed ? tr('studio.skill.passed') : tr('studio.skill.notYet') });
          momentTimer.current.schedule(() => setMasteryMoment(moment), 800);
        } else setBubble({ kind: 'success', text: tr('studio.skill.solved') });
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
      const lang = currentLang();
      const badgeName = newBadge ? conceptText(newBadge, CONCEPTS[newBadge], lang).badge : '';
      const starLine = star === 'clean' ? tr('studio.star.gold') : tr('studio.star.silver');
      const headline = masterEarned ? tr('studio.head.master') : newBadge ? tr('studio.head.badge', { badge: badgeName }) : islandSailed && island ? tr('studio.head.sailed', { island: localizeStage(island, lang).name }) : unitMastered ? tr('studio.head.unit') : tr('studio.head.quest');
      const base = `${headline}${starLine}`;
      setBubble({ kind: 'success', text: announce(base, all, newBadge, lang), mood: hasEarned(all) ? 'cheer' : undefined });
      const names = stickerNames(all, newBadge, lang).join(tr('word.and'));
      toast.show({ text: newBadge ? tr('studio.toast.badge', { badge: badgeName, stickers: names ? tr('studio.toast.stickersAfter', { names }) : '' }) : names ? tr('studio.newSticker', { names }) : tr('studio.toast.quest', { title: localizeQuest(q, lang).title }) }, 5000);
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
        toast.show({ text: tr('studio.movieReady') }, 6000);
      }
      if (s === 'done') {
        const { earned, run } = creditRun();
        if (questRef.current) checkActiveQuest(earned, run);
        else {
          setFriendQueue((f) => [...f, ...earned.newFriends]);
          const cheer = hasEarned(earned);
          // A game keeps its "Game on!" message while it is being played, unless something new arrived.
          if (!sessionRef.current || cheer) {
            const base = sessionRef.current ? tr('studio.gameWorks') : pickLine(linesFor(modeRef.current, currentLang()).success, runCountRef.current);
            setBubble((b) => (b.kind === 'problem' ? b : { kind: 'success', text: announce(base, earned, null, currentLang()), mood: cheer ? 'cheer' : undefined }));
          }
          const names = stickerNames(earned, null, currentLang());
          if (names.length) toast.show({ text: tr('studio.newSticker', { names: names.join(tr('word.and')) }) }, 5000);
        }
        // The first star is finished: invite the child to make it their own.
        if (firstWinPhase.current === 'drawing') {
          showFirstWinYours();
          setBubble({ kind: 'success', text: firstWinText(modeRef.current, tr).yours, mood: 'cheer' });
        }
      }
      if (s === 'paused') setBubble((b) => (b.kind === 'problem' ? b : { kind: 'info', text: tr('studio.paused') }));
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
    setBubble({ kind: 'info', text: little ? tr('studio.step.little') : tr('studio.step.coder') });
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
    setBubble({ kind: 'info', text: tr('studio.allClean') });
  };

  /* ---------------- voice and typed commands ---------------- */

  const undo = () => {
    const previous = undoStack.current.pop();
    if (previous === undefined) {
      setBubble({ kind: 'info', text: tr('studio.nothingUndo') });
      return;
    }
    setCode(previous);
    editorRef.current?.replaceAll(previous);
    setBubble({ kind: 'info', text: tr('studio.undone') });
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
        setBubble({ kind: 'info', text: tr('studio.slower') });
        return;
      case 'faster':
        setSpeed((s) => FASTER[s]);
        setBubble({ kind: 'info', text: tr('studio.faster') });
        return;
      case 'zoom':
        setSpeed('rocket');
        setBubble({ kind: 'info', text: tr('studio.zoom') });
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
    setBubble({ kind: 'info', text: tr('studio.thinkDraw') });
    const before = code;
    try {
      const { code: aiCode } = await api.askTurtle(prompt, code.trim() ? code : undefined, style);
      const suggested = titleFromCode(aiCode);
      const next = little ? withoutComments(aiCode) : aiCode;
      borrowedRef.current.add(next.trim());
      replaceCode(next);
      if (suggested && (isDefaultTitle(title) || !project)) setTitle(suggested);
      run(next);
      if (before.trim()) {
        toast.show({ text: tr('studio.changed'), action: { label: tr('btn.undo'), run: undo } }, 6000);
      }
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.redirect) {
        setBubble({ kind: 'info', text: err.message, mood: 'calm' });
        toast.show({ text: tr('studio.somethingElse') });
      } else {
        setBubble({ kind: 'problem', text: err instanceof Error ? err.message : tr('studio.wentWrong') });
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
      setBubble({ kind: 'info', text: little ? tr('studio.explain.noBlocks') : tr('studio.explain.noCode') });
      return;
    }
    if (quest && !questDone) {
      help.note('explain');
      if (skill.isActive(quest.id)) setHinted(true);
    }
    setExplaining(true);
    setBubble({ kind: 'info', text: tr('studio.explain.looking') });
    try {
      const { text } = await api.explain(code, style);
      setBubble({ kind: 'info', text });
    } catch (err) {
      const redirect = err instanceof ApiError && err.redirect;
      setBubble({ kind: redirect ? 'info' : 'problem', text: err instanceof Error ? err.message : tr('studio.explain.failed'), mood: redirect ? 'calm' : undefined });
    } finally {
      setExplaining(false);
    }
  };

  /* ---------------- save & share ---------------- */

  const save = async (): Promise<string | null> => {
    const cleanTitle = title.trim() || defaultTitle();
    setSaving(true);
    try {
      if (project && owned) {
        await api.updateProject(project.slug, project.editKey!, { title: cleanTitle, code });
        setSavedSnapshot(`${cleanTitle}\n${code}`);
        toast.show({ text: tr('studio.saved') });
        return project.slug;
      }
      const created = await api.createProject(cleanTitle, code);
      local.rememberEditKey(created.slug, created.editKey);
      local.clearDraft();
      setProject({ slug: created.slug, editKey: created.editKey });
      setSavedSnapshot(`${cleanTitle}\n${code}`);
      // Update the address bar in place so the drawing on stage isn't reloaded.
      window.history.replaceState(null, '', `/p/${created.slug}`);
      toast.show({ text: project ? tr('studio.savedCopy') : tr('studio.saved') });
      return created.slug;
    } catch (err) {
      toast.show({ text: err instanceof Error ? err.message : tr('studio.saveFailed') });
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
        await navigator.share({ title: `${title} · GIO`, text: tr('studio.shareText'), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.show({ text: tr('studio.linkCopied') });
    } catch {
      toast.show({ text: tr('studio.yourLink', { url }) }, 8000);
    }
  };

  const exportPicture = () => {
    const url = stageRef.current?.toPNG();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(title, 'png');
    a.click();
    toast.show({ text: tr('studio.savedPicture') });
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
    const svg = toSVG(stageRef.current?.events() ?? [], { title: title || tr('studio.svgTitle') });
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(title, 'svg');
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.show({ text: tr('studio.savedFile') });
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
    setTitle(defaultTitle());
    onReset();
    setBubble(welcome(mode));
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
          {t('studio.myBlocks')}
        </h2>
        <button type="button" className="btn btn-ghost min-h-[var(--touch)] px-3 text-[14px]" onClick={() => setShowLogoUnderBlocks((v) => !v)} aria-pressed={showLogoUnderBlocks}>
          {showLogoUnderBlocks ? t('studio.hideCode') : t('studio.seeCode')}
        </button>
      </div>
      {showLogoUnderBlocks && (
        <pre className="m-0 px-5 py-3 max-h-[160px] overflow-auto bg-paper-2 border-b border-line font-mono text-[15px] font-bold text-[#0b7a4f]" aria-label={t('studio.blocksAsLogo')}>
          {code.trim() || t('studio.noCodeYet')}
        </pre>
      )}
      <div className="flex-1 min-h-0">
        {blockView.ok ? (
          <Suspense fallback={<EditorSkeleton />}>
            <BlocksEditor blocks={blockView.blocks} runningLine={runningLine} onChange={(b) => replaceCode(blocksToLogo(b, lang))} />
          </Suspense>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="m-0 text-[20px] font-black">{t('studio.bigKid')}</p>
            <p className="m-0 text-[16px] font-semibold text-ink-2">{t('studio.bigKidWhy', { reason: blockView.reason })}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={startNew}>
                {t('studio.startBlocks')}
              </button>
              <button type="button" className="btn btn-quiet" onClick={chooseAgain}>
                {t('studio.switchTo', { mode: t('mode.coder') })}
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
          {t('studio.yourCode')}
        </h2>
        <div className="segmented" role="tablist" aria-label={t('studio.codeLanguage')}>
          {CODE_TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" id={`tab-${tab.id}`} aria-selected={codeTab === tab.id} aria-controls={`panel-${tab.id}`} onClick={() => setCodeTab(tab.id)}>
              {tab.label}
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
            <PythonPanel py={py} logo={code} logoRunningLine={runningLine} onCopied={() => toast.show({ text: t('studio.copied') })} />
          ) : (
            <TranslatedCode language={codeTab} logo={code} runningLine={runningLine} onCopied={() => toast.show({ text: t('studio.copied') })} />
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
        saveLabel={project && !owned ? t('btn.saveCopy') : t('btn.save')}
        saveDisabled={saving || (!dirty && owned)}
        onSave={() => void save()}
        sharing={saving}
        onShare={() => void share()}
        onNew={startNew}
      />

      <main className="studio-main flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5">
        {skill.run && quest && (
          <SkillCheckBanner
            stageName={((s) => (s ? localizeStage(s, lang).name : t('studio.theStage')))(islandByKey(skill.run.targetKey))}
            position={skill.run.index + 1}
            total={skill.run.plan.length}
            helped={hinted}
            onStop={() => {
              leaveQuest();
              toast.show({ text: t('studio.skill.stopped') });
            }}
          />
        )}
        {quest ? (
          <QuestCard quest={quest} done={questDone} feedback={questFeedback} star={questStar} hinted={hinted && !skill.run} review={review ? { index: review.index, total: review.ids.length } : null} eyebrow={quest.id.startsWith('daily-') ? FUN_TEXT.dailyEyebrow((dailyPlayRef.current ?? todaysPuzzle(mode)).number) : undefined} nextLabel={quest.id.startsWith('daily-') ? FUN_TEXT.dailySeeResult : skill.run ? t('btn.nextChallenge') : review ? (review.index + 1 < review.ids.length ? t('btn.nextReview') : t('btn.finishReview')) : t('btn.nextQuest')} onHint={() => void askForHint()} onNext={quest.id.startsWith('daily-') ? openDaily : nextQuest} onLeave={leaveQuest} onVoice={(text) => {
            const command = parseVoiceCommand(text);
            if (command) doCommand(command);
            else setBubble({ kind: 'info', text: tr('studio.questVoice') });
          }} />
        ) : (
          <AskFold widthClass={win.widthClass} layout={win.layout} open={askOpen} onOpen={setAskOpen} label={little ? t('studio.ask.little') : t('studio.ask.coder')}>
            <AskTurtle mode={mode} hasCode={code.trim().length > 0} busy={asking} onAsk={askAndFold} />
          </AskFold>
        )}

        <div className="studio-shell">
          {codePanel}

          <section ref={paneRef} data-focus={focus.active} className="studio-stage-pane panel p-4 sm:p-5 flex flex-col gap-4" aria-label={t('studio.stagePane')}>
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
                {playing ? t('btn.pause') : status === 'paused' ? t('btn.keepGoing') : t('btn.run')}
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={onStep} disabled={playing}>
                <StepIcon /> <span className="step-label">{t('btn.step')}</span>
              </button>
              </>
              )}
              <div className="segmented studio-speed" role="radiogroup" aria-label={t('studio.speedGroup')}>
                {SPEEDS.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={speed === s.id} onClick={() => setSpeed(s.id)}>
                    <span className="inline-flex items-center gap-1.5">
                      <s.Icon size={18} /> <span className="speed-label">{t(`studio.speed.${s.id}`)}</span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="studio-secondary flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-icon" onClick={onReset} aria-label={t('studio.clear')} title={t('studio.clear')}>
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
                questTip={quest ? localizeQuest(quest, lang).hint : undefined}
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
                    title={readAloud.enabled ? t('studio.readStop') : t('studio.readStart')}
                  >
                    {readAloud.enabled ? <SpeakerIcon /> : <SpeakerOffIcon />} {readAloud.enabled ? t('btn.readingAloud') : t('btn.readAloud')}
                  </button>
                )}
                <button type="button" className="btn btn-quiet min-h-[48px]" onClick={() => void explain()} disabled={explaining || asking}>
                  <BulbIcon className="text-[#f4a72c]" /> {explaining ? t('btn.thinking') : little ? t('btn.whatMade') : t('btn.explainCode')}
                </button>
                {!compact && (
                  <button ref={stuckRef} type="button" className="btn btn-quiet min-h-[48px]" onClick={() => void askForHint()} disabled={tutor.loading || asking || explaining}>
                    <HelpIcon className="text-[#e0861a]" /> {t('btn.imStuck')}
                  </button>
                )}
              </div>
            </div>

            {prints.length > 0 && (
              <div className="studio-extras rounded-[20px] bg-paper-3 px-4 py-3" aria-label={t('studio.prints')}>
                <span className="eyebrow">{t('studio.turtleSays')}</span>
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
          <span className="studio-footer-note">{t('studio.footer')}
          {!little && t('studio.footerPython')}{' '}</span>
          <Link to="/privacy" className="inline-flex min-h-[48px] items-center px-2 underline underline-offset-4 font-extrabold">
            {t('studio.privacy')}
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
            title={title || t('studio.movieTitle')}
            fileName={fileName(title, 'gif')}
            onSaved={() => toast.show({ text: t('studio.savedMovie') })}
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
