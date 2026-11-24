import { initTheme } from './theme';
import { initReveal, countUp, wireHighlight } from './ui';
import { heroCounters, statusBoard } from '../lib/public-render';
import { legend, tileGrid } from '../lib/tiles';
import { diagramPair } from '../lib/diagram';
import { shortDate, ageMinutes } from '../lib/fmt';
import type { PublicData } from '../lib/types';

const LIVE_URL = 'https://raw.githubusercontent.com/NairbN/NairbN.github.io/status/public.json';
const REFRESH_MS = 5 * 60 * 1000;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

let mode: 'live' | 'snapshot' = 'snapshot';
let generatedAt: string | null = null;

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const numOrNull = (v: unknown) => v === undefined || v === null || num(v);
const strOrNull = (v: unknown) => v === undefined || v === null || typeof v === 'string';

/** Reject the whole live document unless every field we render has the right type. */
const valid = (d: any): d is PublicData => {
  if (!isObj(d) || d.schema_version !== 1 || typeof d.generated_at !== 'string' || Number.isNaN(Date.parse(d.generated_at))) return false;
  const { lab, host, gpu, ai, ops, uptime_30d: up } = d;
  if (!isObj(lab) || typeof lab.name !== 'string' || !['guests_total', 'guests_running', 'services_total', 'services_up'].every((k) => num(lab[k]))) return false;
  if (!isObj(host) || !strOrNull(host.role) || !strOrNull(host.cpu) || !['cpu_pct', 'mem_pct', 'mem_total_gb', 'uptime_days'].every((k) => numOrNull(host[k]))) return false;
  if (!isObj(gpu) || !strOrNull(gpu.model) || !['vram_total_gb', 'vram_pct', 'temp_c'].every((k) => numOrNull(gpu[k]))) return false;
  if (!isObj(ai) || !numOrNull(ai.models_available)) return false;
  if (!isObj(up) || !numOrNull(up.overall) || !(up.by_category === undefined || (isObj(up.by_category) && Object.values(up.by_category).every(numOrNull)))) return false;
  if (!isObj(ops) || !['changes_this_month', 'decisions_total', 'last_backup_age_h', 'alerts_firing'].every((k) => numOrNull(ops[k]))) return false;
  if (!(ops.last_restore_test_ok === undefined || ops.last_restore_test_ok === null || typeof ops.last_restore_test_ok === 'boolean')) return false;
  if (!Array.isArray(d.guests) || d.guests.length > 100) return false;
  return d.guests.every((g: any) =>
    isObj(g) && Number.isInteger(g.id) && g.id > 0 && ['symbol', 'name', 'role'].every((k) => typeof g[k] === 'string' && g[k].length <= 80) &&
    typeof g.secret === 'boolean' && typeof g.category === 'string' && typeof g.status === 'string');
};

function bind(d: PublicData) {
  document.querySelectorAll<HTMLElement>('[data-bind]').forEach((el) => {
    const v = el.dataset.bind!.split('.').reduce<any>((o, k) => (o == null ? o : o[k]), d);
    if (v !== undefined && v !== null) el.textContent = String(v);
  });
}

function render(d: PublicData) {
  generatedAt = d.generated_at;
  $('hero-counters')!.innerHTML = heroCounters(d);
  $('board-slot')!.innerHTML = statusBoard(d);
  $('diagram-slot')!.innerHTML = diagramPair(d.guests, false);
  $('tiles-slot')!.innerHTML = legend() + tileGrid(d.guests);
  const f = $('foot-updated');
  if (f) { f.textContent = shortDate(d.generated_at); f.setAttribute('datetime', d.generated_at); }
  bind(d);
  hl?.refresh();
}

function badge() {
  const b = $('live-badge'), t = $('live-text');
  if (!b || !t) return;
  b.dataset.mode = mode;
  b.querySelector('.dot')!.setAttribute('data-status', mode === 'live' ? 'up' : 'stopped');
  if (mode === 'live') {
    const m = ageMinutes(generatedAt);
    t.textContent = m === null ? 'Live' : m < 1 ? 'Live · updated just now' : m < 60 ? `Live · updated ${Math.round(m)} min ago` : `Live · updated ${Math.round(m / 60)} h ago`;
  } else {
    t.textContent = 'Snapshot';
  }
}

async function fetchLive() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(`${LIVE_URL}?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!valid(d)) throw new Error('bad schema');
    render(d);
    mode = 'live';
  } catch {
    /* silent: keep whatever is on screen (the baked snapshot, or the last live copy) */
  } finally {
    clearTimeout(timer);
    badge();
  }
}

initTheme();
initReveal();
const hl = wireHighlight(document.getElementById('main')!);
badge();
countUp(document.getElementById('hero-counters')!);

// case study dialogs
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-open]');
  if (open) {
    const dlg = document.getElementById(open.dataset.open!) as HTMLDialogElement | null;
    if (dlg && typeof dlg.showModal === 'function') { dlg.showModal(); document.documentElement.style.overflow = 'hidden'; }
    return;
  }
  const dlg = t.closest('dialog');
  if (dlg && (t.closest('[data-close]') || t === dlg)) (dlg as HTMLDialogElement).close();
});
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('close', () => { document.documentElement.style.overflow = ''; }));

// nav scroll-spy
const links = [...document.querySelectorAll<HTMLAnchorElement>('.nav-links a')];
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver((es) => {
    for (const en of es) if (en.isIntersecting) links.forEach((a) => { if (a.hash === `#${en.target.id}`) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => spy.observe(s));
}

// live refresh: now, then every 5 minutes while visible
fetchLive();
let timer: number | undefined;
const schedule = () => { window.clearInterval(timer); if (!document.hidden) timer = window.setInterval(fetchLive, REFRESH_MS); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchLive(); schedule(); });
schedule();
window.setInterval(badge, 30000);
