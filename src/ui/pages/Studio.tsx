import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { blocksToLogo, check, execute, toBlocks, type Block, type TargetLanguage } from '../../logo/index.js';
import { checkQuest, CONCEPTS, type Quest } from '../../logo/quests.js';
import { api, local, type AssistantStyle } from '../api';
import { AskTurtle } from '../components/AskTurtle';
import { CommandShelf } from '../components/CommandShelf';
import { Wordmark } from '../components/GioMark';
import {
  BulbIcon,
  DownloadIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RabbitSpeedIcon,
  ResetIcon,
  RocketSpeedIcon,
  SaveIcon,
  ShareIcon,
  StepIcon,
  TrophyIcon,
  TurtleSpeedIcon,
} from '../components/icons';
import { QuestCard, QuestMap } from '../components/Quests';
import { Stage, type StageHandle } from '../components/Stage';
import { useToast } from '../components/Toast';
import { TranslatedCode } from '../components/TranslatedCode';
import { TurtleBubble, type BubbleMessage } from '../components/TurtleBubble';
import { BlocksEditor } from '../editor/BlocksEditor';
import { LogoEditor, type LogoEditorHandle } from '../editor/LogoEditor';
import { MODE_LABEL, useMode, type AgeMode } from '../mode';
import { useProgress } from '../progress';
import type { PlayerStatus, Speed } from '../runtime/player';

const DEFAULT_TITLE = 'My drawing';

const WELCOME: Record<AgeMode, BubbleMessage> = {
  little: { kind: 'info', text: "Hi, I'm Gio! Tap the blocks below to tell me where to go, then press Run." },
  coder: { kind: 'info', text: "Hi, I'm Gio! Tell me what to draw up top, or type FD 100 in the code box and press Run." },
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

function fileName(title: string): string {
  const safe = title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  return `${safe || 'gio-drawing'}.png`;
}

type Loaded = { title: string; code: string; slug: string | null; editKey: string | null };

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
      .then((p) => !cancelled && setLoaded({ title: p.title, code: p.code, slug: p.slug, editKey: local.editKeyFor(p.slug) ?? null }))
      .catch((err: Error) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, [routeSlug]);

  if (loadError) {
    return (
      <CenteredMessage
        title="I couldn't find that drawing"
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

  const [title, setTitle] = useState(initial.title);
  const [code, setCode] = useState(initial.code);
  const [project, setProject] = useState<{ slug: string; editKey: string | null } | null>(
    initial.slug ? { slug: initial.slug, editKey: initial.editKey } : null,
  );
  const [savedSnapshot, setSavedSnapshot] = useState(initial.slug ? `${initial.title}\n${initial.code}` : '');
  const [status, setStatus] = useState<PlayerStatus>('idle');
  const [speed, setSpeed] = useState<Speed>(little ? 'turtle' : 'rabbit');
  const [bubble, setBubble] = useState<BubbleMessage>(initial.code ? { kind: 'info', text: 'Press Run to watch me draw it!' } : WELCOME[mode]);
  const [prints, setPrints] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [codeTab, setCodeTab] = useState<CodeTab>('logo');
  const [runningLine, setRunningLine] = useState<number | null>(null);
  const [showLogoUnderBlocks, setShowLogoUnderBlocks] = useState(false);

  const [questsOpen, setQuestsOpen] = useState(false);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [questFeedback, setQuestFeedback] = useState<string | null>(null);
  const [questDone, setQuestDone] = useState(false);
  const codeRef = useRef(code);
  codeRef.current = code;
  const questRef = useRef(quest);
  questRef.current = quest;

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
    setCode(next);
    editorRef.current?.replaceAll(next);
  }, []);

  // Keep unsaved new work safe in this browser.
  useEffect(() => {
    if (!project) local.saveDraft(title, code);
  }, [project, title, code]);

  useEffect(() => {
    stageRef.current?.setSpeed(speed);
  }, [speed]);

  const run = useCallback((source: string) => {
    setPrints([]);
    editorRef.current?.setProblemLine(null);
    const res = execute(source);
    if (!res.ok) {
      editorRef.current?.setProblemLine(res.problem.line);
      setBubble({ kind: 'problem', text: res.problem.message, line: res.problem.line });
      if (res.partial) {
        stageRef.current?.load(res.partial);
        stageRef.current?.finish();
      }
      return;
    }
    if (!res.result.events.length) {
      setBubble({ kind: 'info', text: 'There are no commands for me yet. Add one, then press Run.' });
      stageRef.current?.reset();
      return;
    }
    setBubble({ kind: 'info', text: 'Here I go!' });
    stageRef.current?.load(res.result);
    stageRef.current?.play();
  }, []);

  // Opening a shared link plays the drawing, so friends see it come to life.
  useEffect(() => {
    if (initial.slug && initial.code.trim()) run(initial.code);
  }, [initial, run]);

  /* ---------------- quests ---------------- */

  const startQuest = (q: Quest) => {
    setQuestsOpen(false);
    setQuest(q);
    setQuestDone(false);
    setQuestFeedback(null);
    replaceCode(q.starter ?? '');
    stageRef.current?.reset();
    const target = q.target ? execute(q.target) : null;
    stageRef.current?.setGuide(target?.ok ? target.result : null);
    setBubble({ kind: 'info', text: q.starter ? 'This code has a bug. Press Run to see what goes wrong!' : q.goal });
  };

  const leaveQuest = () => {
    setQuest(null);
    setQuestFeedback(null);
    stageRef.current?.setGuide(null);
    setBubble(WELCOME[mode]);
  };

  const nextQuest = () => {
    const list = progress.quests;
    const at = quest ? list.findIndex((q) => q.id === quest.id) : -1;
    const next = list.slice(at + 1).find((q) => !progress.completed.includes(q.id)) ?? list.find((q) => !progress.completed.includes(q.id));
    if (next) startQuest(next);
    else {
      leaveQuest();
      toast.show({ text: 'You finished every quest! Amazing!' }, 6000);
    }
  };

  const checkActiveQuest = useCallback(() => {
    const q = questRef.current;
    if (!q) return;
    const result = checkQuest(q, codeRef.current);
    setQuestFeedback(result.message);
    if (!result.pass) {
      setBubble({ kind: 'info', text: result.message });
      return;
    }
    setQuestDone(true);
    const { newBadge } = progress.complete(q.id);
    setBubble({ kind: 'success', text: newBadge ? `You earned the ${CONCEPTS[newBadge].badge} badge!` : 'Quest complete! You did it!' });
    toast.show({ text: newBadge ? `New badge: ${CONCEPTS[newBadge].badge}!` : `Quest complete: ${q.title}` }, 5000);
  }, [progress, toast]);

  /* ---------------- player ---------------- */

  const onStatus = useCallback(
    (s: PlayerStatus) => {
      setStatus(s);
      if (s === 'done') {
        if (questRef.current) checkActiveQuest();
        else setBubble((b) => (b.kind === 'problem' ? b : { kind: 'success', text: little ? 'Ta-da! You made that!' : 'Ta-da! Change a number and run it again to see what happens.' }));
      }
      if (s === 'paused') setBubble((b) => (b.kind === 'problem' ? b : { kind: 'info', text: 'Paused. Press Step to go one command at a time.' }));
    },
    [checkActiveQuest, little],
  );

  const onLine = useCallback((line: number | null) => {
    editorRef.current?.setRunningLine(line);
    setRunningLine(line);
  }, []);
  const onPrint = useCallback((text: string) => setPrints((p) => [...p, text].slice(-50)), []);

  const onRunPress = () => {
    if (status === 'playing') return stageRef.current?.pause();
    if (status === 'paused') return stageRef.current?.play();
    run(code);
  };

  const onStep = () => {
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
    stageRef.current?.reset();
    editorRef.current?.setProblemLine(null);
    setPrints([]);
    setBubble({ kind: 'info', text: 'All clean! Press Run when you\u2019re ready.' });
  };

  /* ---------------- AI ---------------- */

  const ask = async (prompt: string): Promise<boolean> => {
    setAsking(true);
    setBubble({ kind: 'info', text: 'Hmm, let me think about how to draw that…' });
    const before = code;
    try {
      const { code: aiCode } = await api.askTurtle(prompt, code.trim() ? code : undefined, style);
      const suggested = titleFromCode(aiCode);
      const next = little ? withoutComments(aiCode) : aiCode;
      replaceCode(next);
      if (suggested && (title === DEFAULT_TITLE || !project)) setTitle(suggested);
      run(next);
      if (before.trim()) {
        toast.show({ text: 'I changed your drawing.', action: { label: 'Undo', run: () => replaceCode(before) } }, 6000);
      }
      return true;
    } catch (err) {
      setBubble({ kind: 'problem', text: err instanceof Error ? err.message : 'Something went wrong. Try again?' });
      return false;
    } finally {
      setAsking(false);
    }
  };

  const explain = async () => {
    if (!code.trim()) {
      setBubble({ kind: 'info', text: little ? 'Add some blocks first, then I can tell you what they do!' : 'Write some code first, then I can explain it.' });
      return;
    }
    setExplaining(true);
    setBubble({ kind: 'info', text: 'Let me look at your code…' });
    try {
      const { text } = await api.explain(code, style);
      setBubble({ kind: 'info', text });
    } catch (err) {
      setBubble({ kind: 'problem', text: err instanceof Error ? err.message : 'I could not explain that right now.' });
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

  const download = () => {
    const url = stageRef.current?.toPNG();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName(title);
    a.click();
  };

  const startNew = () => {
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

  const playing = status === 'playing';
  const doneCount = progress.completed.filter((id) => progress.quests.some((q) => q.id === id)).length;

  /* ---------------- render ---------------- */

  const codePanel = little ? (
    <section className="panel flex flex-col min-h-[460px] lg:h-[calc(100vh-300px)] lg:min-h-[600px] order-2 lg:order-1" aria-labelledby="code-title">
      <div className="panel-header">
        <h2 id="code-title" className="text-[20px] font-black">
          My blocks
        </h2>
        <button type="button" className="btn btn-ghost min-h-[40px] px-3 text-[14px]" onClick={() => setShowLogoUnderBlocks((v) => !v)} aria-pressed={showLogoUnderBlocks}>
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
          <BlocksEditor blocks={blockView.blocks} runningLine={runningLine} onChange={(b) => replaceCode(blocksToLogo(b))} />
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
    <section className="panel flex flex-col min-h-[420px] lg:h-[calc(100vh-300px)] lg:min-h-[560px] order-2 lg:order-1" aria-labelledby="code-title">
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
      <div id="panel-logo" role="tabpanel" aria-labelledby="tab-logo" className="flex-1 min-h-0" hidden={codeTab !== 'logo'}>
        <LogoEditor ref={editorRef} initialCode={code} onChange={setCode} onRunShortcut={() => run(codeRef.current)} />
      </div>
      {codeTab !== 'logo' && (
        <div id={`panel-${codeTab}`} role="tabpanel" aria-labelledby={`tab-${codeTab}`} className="flex-1 min-h-0">
          <TranslatedCode language={codeTab} logo={code} runningLine={runningLine} onCopied={() => toast.show({ text: 'Copied!' })} />
        </div>
      )}
      {codeTab === 'logo' && <CommandShelf onInsert={(snippet) => editorRef.current?.insert(snippet)} />}
    </section>
  );

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[rgba(245,242,234,0.82)] border-b border-line">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 h-[72px] flex items-center gap-3">
          <a href="/" onClick={(e) => (e.preventDefault(), startNew())} aria-label="GIO home" className="shrink-0 rounded-2xl">
            <Wordmark />
          </a>
          <div className="flex-1 flex justify-center min-w-0">
            <label htmlFor="title" className="sr-only">
              Drawing name
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="w-full max-w-[320px] min-h-[44px] px-4 rounded-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-line focus:border-line text-center text-[18px] font-extrabold text-ink outline-none transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" className="btn btn-ghost hidden xl:inline-flex" onClick={chooseAgain} title="Switch age mode">
              {MODE_LABEL[mode]}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setQuestsOpen(true)} aria-label={`Quests, ${doneCount} of ${progress.quests.length} done`}>
              <TrophyIcon className="text-[#f4a72c]" /> <span className="hidden md:inline">Quests</span>
              <span className="rounded-full bg-paper-3 px-2 py-0.5 text-[13px] font-black tabular-nums">
                {doneCount}/{progress.quests.length}
              </span>
            </button>
            <button type="button" className="btn btn-ghost hidden lg:inline-flex" onClick={startNew}>
              <PlusIcon /> New
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => void save()} disabled={saving || (!dirty && owned)} aria-label={project && !owned ? 'Save a copy' : 'Save'}>
              <SaveIcon /> <span className="hidden sm:inline">{project && !owned ? 'Save a copy' : 'Save'}</span>
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void share()} disabled={saving} aria-label="Share">
              <ShareIcon /> <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-5">
        {quest ? (
          <QuestCard quest={quest} done={questDone} feedback={questFeedback} onHint={() => setBubble({ kind: 'info', text: `Hint: ${quest.hint}` })} onNext={nextQuest} onLeave={leaveQuest} />
        ) : (
          <AskTurtle mode={mode} hasCode={code.trim().length > 0} busy={asking} onAsk={ask} />
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start">
          {codePanel}

          <section className="panel p-4 sm:p-5 flex flex-col gap-4 order-1 lg:order-2" aria-label="Turtle stage">
            {/* Square stage sized so the Run button stays on screen on laptops. */}
            <div className="mx-auto w-full" style={{ maxWidth: 'max(320px, min(640px, calc(100vh - 470px)))' }}>
              <Stage ref={stageRef} onLine={onLine} onPrint={onPrint} onStatus={onStatus} />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={`btn btn-lg ${playing ? 'btn-stop' : 'btn-primary'} min-w-[150px]`} onClick={onRunPress}>
                {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
                {playing ? 'Pause' : status === 'paused' ? 'Keep going' : 'Run'}
              </button>
              <button type="button" className="btn btn-quiet btn-lg" onClick={onStep} disabled={playing}>
                <StepIcon /> Step
              </button>
              <div className="segmented" role="radiogroup" aria-label="Turtle speed">
                {SPEEDS.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={speed === s.id} onClick={() => setSpeed(s.id)}>
                    <span className="inline-flex items-center gap-1.5">
                      <s.Icon size={18} /> {s.label}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-icon" onClick={onReset} aria-label="Clear the drawing" title="Clear the drawing">
                  <ResetIcon />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={download} aria-label="Download picture" title="Download picture">
                  <DownloadIcon />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <TurtleBubble message={bubble} onShowLine={(line) => editorRef.current?.setProblemLine(line)} />
              <div className="flex justify-end">
                <button type="button" className="btn btn-quiet" onClick={() => void explain()} disabled={explaining || asking}>
                  <BulbIcon className="text-[#f4a72c]" /> {explaining ? 'Thinking…' : little ? 'What did I make?' : 'Explain my code'}
                </button>
              </div>
            </div>

            {prints.length > 0 && (
              <div className="rounded-[20px] bg-paper-3 px-4 py-3" aria-label="Messages from PRINT">
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

        <footer className="pt-2 pb-6 text-center text-[13px] font-semibold text-ink-3">
          GIO brings back Logo (1967), the language Seymour Papert and friends made so kids could learn by teaching a turtle.
          {!little && ' Its turtle still lives on in Python today.'}
        </footer>
      </main>

      <QuestMap
        open={questsOpen}
        quests={progress.quests}
        completed={progress.completed}
        badges={progress.badges}
        showPython={!little}
        onPick={startQuest}
        onClose={() => setQuestsOpen(false)}
      />
      {toast.view}
    </div>
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
