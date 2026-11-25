// Shared by the Settings pages: wait for the session, show the gate or the page, and save with clear feedback.
import { api, errText, Offline, type Res } from './api';
import { getSession, loadSettings, type SessionInfo } from './portal';
import { toast } from './dom';

export interface Ctx { session: SessionInfo; all: any; root: HTMLElement }

export async function initSettings(): Promise<Ctx | null> {
  const root = document.getElementById('s-root')!, gate = document.getElementById('gate')!;
  const s = await getSession();
  if (s.state !== 'in') {
    gate.hidden = false;
    if (s.state === 'off') {
      document.getElementById('gate-text')!.textContent = 'The control service is offline, so settings cannot be loaded or saved. The portal stays read-only until it is back.';
      document.getElementById('gate-login')!.hidden = true;
    }
    return null;
  }
  const all = await loadSettings();
  if (!all) { gate.hidden = false; document.getElementById('gate-text')!.textContent = 'Settings could not be loaded. Reload the page to try again.'; document.getElementById('gate-login')!.hidden = true; return null; }
  root.hidden = false;
  return { session: s, all, root };
}

export async function put(path: string, body: unknown, opts: { method?: string; stepup?: string; quiet?: boolean; ok?: string } = {}): Promise<Res | null> {
  try {
    const r = await api(path, { method: opts.method ?? 'PUT', body, stepup: opts.stepup });
    if (r.ok) { if (!opts.quiet) toast(opts.ok ?? 'Saved'); return r; }
    if (r.status === 403 && r.data?.error === 'stepup') return r;
    if (r.status === 401) { toast('Your session ended. Sign in again.', 'bad'); return r; }
    toast(errText(r), 'bad'); return r;
  } catch (e) { toast(e instanceof Offline ? 'The control service is offline. Nothing was saved.' : 'Could not save.', 'bad'); return null; }
}

export function debounce<A extends any[]>(fn: (...a: A) => void, ms: number) { let t: number | undefined; return (...a: A) => { clearTimeout(t); t = window.setTimeout(() => fn(...a), ms); }; }
