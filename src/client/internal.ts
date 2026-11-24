// Internal portal runtime. Same-origin only: it never contacts any other host.
import { initTheme } from './theme';
import { initReveal, wireHighlight } from './ui';
import { linksHtml, vitalsHtml, guestTableHtml, servicesHtml, aiHtml, opsHtml, expiryHtml, panelHtml, type SortKey } from '../lib/internal-render';
import { legend, tileGrid } from '../lib/tiles';
import { diagram } from '../lib/diagram';
import { ageMinutes } from '../lib/fmt';
import type { InternalData } from '../lib/types';

const DATA_URL = '/data/internal.json';
const $ = (id: string) => document.getElementById(id)!;
let data: InternalData | null = null;
let sort: { k: SortKey; dir: 1 | -1 } = { k: 'id', dir: 1 };
let selected: number | null = null;
let fetchOk = true;

const valid = (d: any): d is InternalData => d && d.schema_version === 1 && Array.isArray(d.guests) && d.host;

function renderPanel() {
  const panel = $('panel');
  const g = data?.guests.find((x) => x.id === selected);
  if (!g) { panel.hidden = true; $('scrim').hidden = true; return; }
  $('panel-body').innerHTML = panelHtml(g);
  panel.hidden = false; $('scrim').hidden = false;
}

function render(d: InternalData) {
  data = d;
  const now = Date.now();
  $('links-slot').innerHTML = linksHtml(d);
  $('tiles-slot').innerHTML = legend() + tileGrid(d.guests, true);
  $('diagram-slot').innerHTML = diagram(d.guests, { internal: true, orient: 'tall', hostName: (d.host.name as string) ?? undefined });
  $('vitals-slot').innerHTML = vitalsHtml(d);
  $('guests-slot').innerHTML = guestTableHtml(d.guests, sort, now);
  $('services-slot').innerHTML = servicesHtml(d);
  $('ai-slot').innerHTML = aiHtml(d);
  $('ops-slot').innerHTML = opsHtml(d, now);
  $('expiry-slot').innerHTML = expiryHtml(d, now);
  hl.refresh();
  if (selected !== null) renderPanel();
}

function fresh() {
  const el = $('fresh'), txt = $('fresh-text');
  const m = ageMinutes(data?.generated_at);
  if (m === null) { txt.textContent = 'Updated —'; el.dataset.state = 'stale'; return; }
  const s = Math.round(m * 60);
  const stale = m > 3 || !fetchOk;
  el.dataset.state = stale ? 'stale' : 'ok';
  el.querySelector('.dot')!.setAttribute('data-status', stale ? 'warn' : 'up');
  const age = s < 90 ? `${s}s ago` : m < 90 ? `${Math.round(m)} min ago` : `${Math.round(m / 60)} h ago`;
  txt.textContent = `Updated ${age}${!fetchOk ? ' (connection lost)' : m > 3 ? ' (stale)' : ''}`;
}

async function load() {
  try {
    const r = await fetch(DATA_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    if (!valid(d)) throw new Error('bad schema');
    fetchOk = true;
    render(d);
  } catch {
    fetchOk = false;
  }
  fresh();
}

function openGuest(id: number | null) {
  selected = id;
  renderPanel();
  if (id !== null) $('panel-close').focus();
}
function closePanel(returnFocus = true) {
  const id = selected;
  selected = null; hl.clear(); renderPanel();
  if (returnFocus && id !== null) document.querySelector<HTMLElement>(`.tile[data-id="${id}"]`)?.focus();
}

initTheme();
initReveal();
const hl = wireHighlight(document.getElementById('main')!, (id) => openGuest(id));

$('panel-close').addEventListener('click', () => closePanel());
$('scrim').addEventListener('click', () => closePanel(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected !== null) closePanel(); });

// sortable guest table; row click/Enter opens the side panel
$('guests-slot').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sort]');
  if (b) {
    const k = b.dataset.sort as SortKey;
    sort = sort.k === k ? { k, dir: (sort.dir * -1) as 1 | -1 } : { k, dir: 1 };
    if (data) $('guests-slot').innerHTML = guestTableHtml(data.guests, sort);
    $('guests-slot').querySelector<HTMLElement>(`[data-sort="${k}"]`)?.focus();
    return;
  }
  const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]');
  if (tr) { selected = Number(tr.dataset.id); renderPanel(); $('panel-close').focus(); }
});
$('guests-slot').addEventListener('keydown', (e) => {
  const tr = (e.target as HTMLElement).closest<HTMLElement>('tr[data-id]');
  if (tr && (e.key === 'Enter' || e.key === ' ') && e.target === tr) { e.preventDefault(); tr.click(); }
});

load();
setInterval(load, 60_000);
setInterval(fresh, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
