import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Wordmark } from './components/GioMark';
import { ModePicker } from './components/ModePicker';
import { AppStatus } from './components/AppStatus';
import { LangProvider } from './lang';
import { tr } from './lang-state';
import { ModeProvider, useMode } from './mode';
import NotFound from './pages/NotFound';
import Studio from './pages/Studio';
// Pages most visits never open load on demand.
const Certificate = lazy(() => import('./pages/Certificate'));
const Privacy = lazy(() => import('./pages/Privacy'));
// Gio's Adventure (engine, art and levels) is its own file, so the studio opens without it.
const Adventure = lazy(() => import('./pages/Adventure'));
const AdventureLevel = lazy(() => import('./pages/AdventureLevel'));
/** A calm full-height placeholder while a page loads, so nothing jumps. */
function PageFallback() {
  return <div className="min-h-full" aria-busy="true" />;
}
import { useWindowClass } from './responsive/useWindowClass';

interface ErrorBoundaryState {
  error: Error | null;
}

/** Last line of defence: a friendly screen instead of a blank page if rendering ever fails. */
class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[GIO] render error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="panel max-w-md w-full p-8 text-center flex flex-col items-center gap-4">
          <Wordmark />
          <h1 className="text-[24px] font-black">{tr('error.boundary.title')}</h1>
          <p className="text-[16px] font-semibold text-ink-2">{tr('error.boundary.body')}</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            {tr('btn.tryAgain')}
          </button>
        </div>
      </div>
    );
  }
}

/** Every studio visit needs an age mode first; the picker appears until one is chosen. */
function StudioGate() {
  const { mode } = useMode();
  return mode ? <Studio /> : <ModePicker />;
}

/** The adventure needs an age mode too: the picker shows until one is chosen. */
function AdventureGate({ children }: { children: ReactNode }) {
  const { mode } = useMode();
  return mode ? <Suspense fallback={<PageFallback />}>{children}</Suspense> : <ModePicker />;
}
export default function App() {
  useWindowClass();
  return (
    <AppErrorBoundary>
      <LangProvider>
      <ModeProvider>
        <Routes>
          <Route path="/" element={<StudioGate />} />
          <Route path="/p/:slug" element={<StudioGate />} />
          <Route path="/adventure" element={<AdventureGate><Adventure /></AdventureGate>} />
          <Route path="/adventure/:levelId" element={<AdventureGate><AdventureLevel /></AdventureGate>} />
          <Route path="/certificate" element={<Suspense fallback={<PageFallback />}><Certificate /></Suspense>} />
          <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><Privacy /></Suspense>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AppStatus />
      </ModeProvider>
      </LangProvider>
    </AppErrorBoundary>
  );
}
