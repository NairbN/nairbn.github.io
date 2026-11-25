// Portal shell, loaded on every internal page: session, read-only banner, account menu, Needs you, installed-app hints,
// service worker, appearance + Overview layout from the user's settings. All requests are same-origin.
import { api, Offline } from './api';
import { applyAppearance, cached, cache, applyTheme, type Appearance } from './appearance';
import { h, $, toast, fmtWhen } from './dom';

export interface SessionInfo { state: 'in' | 'out' | 'off'; user?: string; device?: string; expires_at?: string; passkeys?: number; recovery_confirmed?: boolean }
const root = document.documentElement;
let sess: Promise<SessionInfo> | null = null;

async function fetchSession(): Promise<SessionInfo> {
  try {
    const r = await api('/api/session', { timeout: 3000 });
    if (r.status >= 500 || r.data === null || typeof r.data !== 'object') return { state: 'off' };
    if (r.data.signed_in) return { state: 'in', user: r.data.user, device: r.data.device, expires_at: r.data.expires_at, passkeys: r.data.passkeys, recovery_confirmed: r.data.recovery_confirmed };
    return { state: 'out' };
  } catch (e) { if (e instanceof Offline) return { state: 'off' }; return { state: 'off' }; }
}
/** Resolves once per page load (Retry makes a new one). */
export function getSession(): Promise<SessionInfo> { return (sess ??= fetchSession()); }
export async function reloadSession() { sess = null; return getSession(); }

// ---- account menu ----
function initAccount(s: SessionInfo) {
  const btn = $('#acct-btn') as HTMLButtonElement | null, menu = $('#acct-menu');
  if (!btn || !menu) return;
  $('#acct-user')!.textContent = s.user ?? 'brian';
  $('#acct-device')!.textContent = s.device ?? '';
  $('#acct-initial')!.textContent = (s.user ?? 'b').charAt(0).toUpperCase();
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; btn.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector<HTMLElement>('a,button')?.focus(); });
  document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target as Node) && e.target !== btn && !btn.contains(e.target as Node)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { close(); btn.focus(); } });
  $('#signout-btn')?.addEventListener('click', signOut);
}
export async function signOut() {
  try { await api('/auth/logout', { body: {} }); } catch { /* the cookie may already be gone */ }
  try { localStorage.removeItem('hl-needs-cache'); } catch { /* ignore */ }
  location.href = '/login/';
}

// ---- needs you ----
const NEEDS_KEY = 'hl-needs-collapsed';
function initNeedsToggle() {
  const d = $('#needs-details') as HTMLDetailsElement | null;
  if (!d) return;
  try { if (localStorage.getItem(NEEDS_KEY) === '1') d.open = false; } catch { /* ignore */ }
  d.addEventListener('toggle', () => { try { localStorage.setItem(NEEDS_KEY, d.open ? '0' : '1'); } catch { /* ignore */ } });
}
const SEV: Record<string, string> = { critical: 'bad', warning: 'warn', info: 'ok' };
async function loadNeeds() {
  const sec = $('#needs'); if (!sec) return;
  let items: any[] | null = null;
  try { const r = await api('/api/needs'); if (r.ok && Array.isArray(r.data?.items)) items = r.data.items; } catch { /* keep what we have */ }
  if (items === null) return;
  const list = $('#needs-list')!, card = $('#needs-details')!;
  list.replaceChildren(...items.map((i) => {
    const a = i.action && typeof i.action.href === 'string' && i.action.href.startsWith('/') ? i.action : null;
    return h('li', { class: 'need', 'data-kind': String(i.kind ?? '') },
      h('span', { class: 'dot', 'data-s': SEV[i.severity] ?? 'ok', 'aria-hidden': 'true' }),
      h('span', { class: 'need-t' }, h('b', null, String(i.title ?? '')), i.detail ? h('span', null, String(i.detail)) : null, i.since ? h('small', null, fmtWhen(i.since)) : null),
      a ? h('a', { class: 'btn-ghost', href: a.href }, String(a.label ?? 'Open')) : null);
  }));
  $('#needs-n')!.textContent = String(items.length);
  card.setAttribute('data-clear', String(items.length === 0));
  $('#needs-empty')!.hidden = items.length > 0;
  const kinds: Record<string, number> = {}; items.forEach((i) => { kinds[i.kind] = (kinds[i.kind] ?? 0) + 1; });
  const names: Record<string, string> = { alert: 'alert', expiry: 'expiring', approval: 'approval', setup: 'to set up' };
  $('#needs-hint')!.textContent = Object.entries(kinds).map(([k, n]) => `${n} ${names[k] ?? k}${k === 'alert' && n > 1 ? 's' : ''}`).join(' · ');
  sec.hidden = false;
}

// ---- Overview layout from the Home screen settings ----
function applyHome(home: any) {
  const cards = $('#cards'); if (!cards || !Array.isArray(home?.cards)) return;
  const map: Record<string, string> = { vitals: 'vitals', needs: 'needs', service_status: 'strip', strip: 'strip', launcher: 'launcher' };
  for (const c of home.cards) {
    const el = cards.querySelector<HTMLElement>(`[data-card="${map[c.id] ?? c.id}"]`);
    if (!el) continue;
    cards.append(el);
    el.setAttribute('data-off', String(c.visible === false));
    if (c.id === 'needs') el.setAttribute('data-user-hidden', String(c.visible === false));
  }
  const groups = home.links;
  const l = $('#launcher');
  if (l && Array.isArray(groups) && groups.length) {
    l.replaceChildren(...groups.map((g: any) => h('section', { class: 'lk-group', 'aria-label': String(g.group) }, h('h3', null, String(g.group)),
      h('ul', null, ...(g.items ?? []).filter((i: any) => /^https?:\/\//.test(String(i.url))).map((i: any) => h('li', null,
        h('a', { class: 'lk plate', href: String(i.url), target: '_blank', rel: 'noopener' }, h('span', { class: 'lk-i', 'aria-hidden': 'true' }, String(i.name).charAt(0).toUpperCase()), h('span', { class: 'lk-t' }, h('b', null, String(i.name)), h('small', null, safeHost(String(i.url)))))))))));
  }
}
const safeHost = (u: string) => { try { return new URL(u).host; } catch { return ''; } };

export async function loadSettings(): Promise<any | null> {
  try { const r = await api('/api/settings'); return r.ok ? r.data : null; } catch { return null; }
}

// ---- install hint (iOS Safari, not standalone) ----
function maybeInstallHint(s: SessionInfo) {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const standalone = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches;
  const dlg = $('#install') as HTMLDialogElement | null;
  if (!dlg || !ios || standalone || s.state !== 'in' || root.getAttribute('data-page') === 'login') return;
  let dismissed: string | null = null;
  try { dismissed = localStorage.getItem('hl-install-dismissed'); } catch { /* ignore */ }
  if (dismissed === 'forever' || (dismissed && Date.now() - Number(dismissed) < 7 * 864e5)) return;
  const done = (forever: boolean) => { try { localStorage.setItem('hl-install-dismissed', forever ? 'forever' : String(Date.now())); } catch { /* ignore */ } dlg.close(); };
  $('#in-ok')!.addEventListener('click', () => done(true));
  $('#in-later')!.addEventListener('click', () => done(false));
  dlg.addEventListener('cancel', () => done(false));
  setTimeout(() => dlg.showModal(), 1200);
}

// ---- service worker (push + notification clicks only) ----
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* push is optional */ });
}

async function boot() {
  const cachedA = cached();
  if (cachedA) applyAppearance(cachedA, { theme: false });
  initNeedsToggle();
  const s = await getSession();
  root.setAttribute('data-auth', s.state);
  const banner = $('#ro-banner');
  if (banner) banner.hidden = s.state !== 'off';
  $('#ro-retry')?.addEventListener('click', async () => {
    const n = await reloadSession(); root.setAttribute('data-auth', n.state);
    if (banner) banner.hidden = n.state !== 'off';
    if (n.state === 'in') { initAccount(n); loadNeeds(); }
    else toast(n.state === 'off' ? 'The control service is still offline.' : 'Control service is back. Sign in to make changes.', n.state === 'off' ? 'bad' : 'ok');
  });
  if (s.state === 'in') {
    initAccount(s);
    registerSW();
    const all = await loadSettings();
    if (all?.appearance) { cache(all.appearance); applyAppearance(all.appearance); }
    if (all?.['home']) applyHome(all['home']);
    loadNeeds();
    setInterval(loadNeeds, 60_000);
    maybeInstallHint(s);
  }
  document.dispatchEvent(new CustomEvent('portal:session', { detail: s }));
}
boot();
export { applyTheme };
export type { Appearance };
