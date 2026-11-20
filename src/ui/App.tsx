import { Component, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Wordmark } from './components/GioMark';
import { ModePicker } from './components/ModePicker';
import { AppStatus } from './components/AppStatus';
import { ModeProvider, useMode } from './mode';
import Certificate from './pages/Certificate';
import NotFound from './pages/NotFound';
import Privacy from './pages/Privacy';
import Studio from './pages/Studio';

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
          <h1 className="text-[24px] font-black">Oops, the turtle tripped!</h1>
          <p className="text-[16px] font-semibold text-ink-2">Something went wrong on this page. Your saved drawings are safe.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => window.location.reload()}>
            Try again
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

export default function App() {
  return (
    <AppErrorBoundary>
      <ModeProvider>
        <Routes>
          <Route path="/" element={<StudioGate />} />
          <Route path="/p/:slug" element={<StudioGate />} />
          <Route path="/certificate" element={<Certificate />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <AppStatus />
      </ModeProvider>
    </AppErrorBoundary>
  );
}
