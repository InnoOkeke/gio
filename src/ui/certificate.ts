import { useCallback, useState } from 'react';
import { cleanName, emptyCertificate, parseCertificate, type CertificateStore } from './path/certificate';

const KEY = 'gio.certificate';

function read(): CertificateStore {
  try {
    const stored = localStorage.getItem(KEY);
    return stored === null ? emptyCertificate() : parseCertificate(JSON.parse(stored) as unknown);
  } catch {
    return emptyCertificate();
  }
}

function write(state: CertificateStore | null): void {
  try {
    if (state === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Storage can be blocked in private browsing; the name then lasts for this visit only. */
  }
}

/** The name on the certificate, kept only in this browser. */
export function useCertificateName() {
  const [name, setNameState] = useState(() => read().name);

  const setName = useCallback((raw: string) => {
    const next = cleanName(raw);
    setNameState(next);
    write(next.trim() ? { v: 1, name: next.trim() } : null);
  }, []);

  /** Remove the name from this browser. */
  const forget = useCallback(() => {
    setNameState('');
    write(null);
  }, []);

  return { name, setName, forget };
}
