// Public site runtime. Same-origin plus one fetch: the sanitized status snapshot on raw.githubusercontent.com.
import { initShell } from './shell';
import { RENDERERS } from '../lib/views';
import { ageMinutes, shortDate } from '../lib/fmt';
import type { PublicData } from '../lib/types';

const LIVE_URL = 'https://raw.githubusercontent.com/NairbN/NairbN.github.io/status/public.json';
const REFRESH_MS = 5 * 60 * 1000;

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

function render(d: PublicData) {
  document.querySelectorAll<HTMLElement>('[data-render]').forEach((el) => {
    const fn = RENDERERS[el.dataset.render ?? ''];
    if (fn) el.innerHTML = fn(d, false);
  });
  const f = document.querySelector<HTMLTimeElement>('[data-updated]');
  if (f) { f.textContent = shortDate(d.generated_at); f.setAttribute('datetime', d.generated_at); }
  tickAge();
}

/** "Updated N min ago": recomputed from the snapshot time, so it stays honest while the tab is open. */
function tickAge() {
  document.querySelectorAll<HTMLTimeElement>('time[data-age]').forEach((t) => {
    const m = ageMinutes(t.getAttribute('datetime'));
    t.textContent = m === null ? 'recently' : m < 1 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 60 * 48 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
    const dot = t.closest('.pill')?.querySelector('[data-age-dot]');
    dot?.setAttribute('data-s', m !== null && m <= 90 ? 'ok' : 'stale');
  });
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
  } catch {
    /* silent: keep whatever is on screen (the baked snapshot, or the last live copy) */
  } finally {
    clearTimeout(timer);
  }
}

// case study dialogs
document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-open]');
  if (open) {
    const dlg = document.getElementById(open.dataset.open!) as HTMLDialogElement | null;
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
    return;
  }
  const dlg = t.closest('dialog');
  if (dlg && (t.closest('[data-close]') || t === dlg)) (dlg as HTMLDialogElement).close();
});

initShell();
tickAge();
setInterval(tickAge, 30_000);

// live refresh: now, then every 5 minutes while the tab is visible
fetchLive();
let timer: number | undefined;
const schedule = () => { window.clearInterval(timer); if (!document.hidden) timer = window.setInterval(fetchLive, REFRESH_MS); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) fetchLive(); schedule(); });
schedule();
