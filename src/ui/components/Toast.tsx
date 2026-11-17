import { useCallback, useEffect, useRef, useState } from 'react';

export interface ToastMessage {
  text: string;
  action?: { label: string; run(): void };
}

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number>();

  const show = useCallback((message: ToastMessage, ms = 4000) => {
    window.clearTimeout(timer.current);
    setToast(message);
    timer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const view = toast ? (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.action ? (
        <button
          type="button"
          className="btn min-h-[36px] px-4 bg-white/15 text-white text-[15px]"
          onClick={() => {
            toast.action!.run();
            setToast(null);
          }}
        >
          {toast.action.label}
        </button>
      ) : (
        <span className="pr-2" />
      )}
    </div>
  ) : null;

  return { show, view };
}
