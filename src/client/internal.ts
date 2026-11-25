// Internal portal runtime. Same-origin only: it never contacts any other host.
import { initShell } from './shell';
import { IRENDER, guestTableHtml, panelHtml, type SortKey } from '../lib/internal-views';
import { ageMinutes } from '../lib/fmt';
import type { InternalData } from '../lib/types';

const DATA_URL = '/data/internal.json';
const $ = (id: string) => document.getElementById(id)!;
let data: InternalData | null = null;
let sort: { k: SortKey; dir: 1 | -1 } = { k: 'id', dir: 1 };
let fetchOk = true;
let opener: HTMLElement | null = null;

const valid = (d: any): d is InternalData => d && d.schema_version === 1 && Array.isArray(d.guests) && d.host;

function render(d: InternalData) {
  data = d;
  const now = Date.now();
  document.querySelectorAll<HTMLElement>('[data-slot]').forEach((el) => {
    const fn = (IRENDER as Record<string, (d: InternalData, now?: number) => string>)[el.dataset.slot ?? ''];
    if (fn) el.innerHTML = fn(d, now);
  });
  $('guests-slot').innerHTML = guestTableHtml(d.guests, sort, now);
}

function fresh() {
  const txt = $('fresh-text'), dot = $('fresh-dot'), m2 = $('fresh-m');
  const m = ageMinutes(data?.generated_at);
  if (m === null) { txt.textContent = 'Updated —'; dot.setAttribute('data-s', 'stale'); m2.textContent = ''; return; }
  const s = Math.round(m * 60);
  const stale = m > 3 || !fetchOk;
  dot.setAttribute('data-s', stale ? 'stale' : 'ok');
  const age = s < 90 ? `${s}s ago` : m < 90 ? `${Math.round(m)} min ago` : `${Math.round(m / 60)} h ago`;
  txt.textContent = `Updated ${age}${!fetchOk ? ', connection lost' : m > 3 ? ', stale' : ''}`;
  m2.textContent = age;
}

async function load() {
  try {
    const r = await fetch(DATA_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!valid(d)) throw new Error('bad schema');
    fetchOk = true;
    render(d);
  } catch { fetchOk = false; }
  fresh();
}

function openGuest(id: number, from: HTMLElement) {
  const g = data?.guests.find((x) => x.id === id);
  if (!g) return;
  opener = from;
  $('panel-body').innerHTML = panelHtml(g);
  ($('panel') as HTMLDialogElement).showModal();
}

initShell();
const dlg = $('panel') as HTMLDialogElement;
dlg.addEventListener('click', (e) => { if (e.target === dlg || (e.target as HTMLElement).closest('[data-close]')) dlg.close(); });
dlg.addEventListener('close', () => opener?.focus());

document.addEventListener('click', (e) => {
  const app = (e.target as HTMLElement).closest<HTMLElement>('.app[data-id]');
  if (app) { openGuest(Number(app.dataset.id), app); return; }
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sort]');
  if (b) {
    const k = b.dataset.sort as SortKey;
    sort = sort.k === k ? { k, dir: (sort.dir * -1) as 1 | -1 } : { k, dir: 1 };
    if (data) $('guests-slot').innerHTML = guestTableHtml(data.guests, sort);
    $('guests-slot').querySelector<HTMLElement>(`[data-sort="${k}"]`)?.focus();
    return;
  }
  const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]');
  if (tr) openGuest(Number(tr.dataset.id), tr);
});
document.addEventListener('keydown', (e) => {
  const tr = (e.target as HTMLElement).closest?.<HTMLElement>('tr[data-id]');
  if (tr && (e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); openGuest(Number(tr.dataset.id), tr); }
});

load();
setInterval(load, 60_000);
setInterval(fresh, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
