// Applies portal appearance settings to the page, live. Used by the shell (from cache, then from the API) and by Settings.
import { BUILTINS } from '../lib/photos';
import { PHOTOS } from '../lib/photos';

export interface Slot { photo?: string; focal?: [number, number] | number[] }
export interface Appearance {
  slots?: Record<string, Slot>; windows?: Record<string, string>; rotation?: 'time' | 'shuffle' | 'fixed'; fixed_photo?: string | null;
  fog?: number; blur?: number; theme?: 'auto' | 'light' | 'dark'; accent?: string;
}
export const PERIODS = ['morning', 'midday', 'night'] as const;
export const DEFAULT_WINDOWS: Record<string, string> = { morning: '05:00', midday: '11:00', night: '18:00' };
export const DEFAULT_SLOTS: Record<string, string> = { morning: 'builtin:chicago-lakefront', midday: 'builtin:chicago-river', night: 'builtin:tokyo-minato' };
export const CACHE_KEY = 'hl-appearance';
const root = document.documentElement;

export function cached(): Appearance | null { try { const v = localStorage.getItem(CACHE_KEY); return v ? JSON.parse(v) : null; } catch { return null; } }
export function cache(a: Appearance) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(a)); } catch { /* storage may be blocked */ } }

const mins = (hhmm: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
export function periodNow(w?: Record<string, string>, now = new Date()): string {
  const win = { ...DEFAULT_WINDOWS, ...(w ?? {}) };
  const t = now.getHours() * 60 + now.getMinutes();
  const order = PERIODS.map((p) => ({ p, at: mins(win[p]) })).sort((a, b) => a.at - b.at);
  let cur = order[order.length - 1].p;
  for (const o of order) if (t >= o.at) cur = o.p;
  return cur;
}

export interface Resolved { src: string; srcset: string; alt: string }
export function resolvePhoto(id: string | undefined | null, blur: boolean): Resolved {
  const fallback = BUILTINS[0];
  if (id && id.startsWith('builtin:')) {
    const b = BUILTINS.find((x) => x.id === id.slice(8)) ?? fallback;
    return { src: `${b.file}-1200.jpg`, srcset: blur ? `${b.file}-1200.jpg 1200w` : `${b.file}-1200.jpg 1200w, ${b.file}-2400.jpg 2400w`, alt: PHOTOS[b.period].alt };
  }
  if (id && /^[0-9a-f]{8,64}$/i.test(id)) {
    const u = (w: number) => `/media/${id}-${w}.webp`;
    return { src: u(1920), srcset: blur ? `${u(960)} 960w, ${u(1920)} 1920w` : `${u(960)} 960w, ${u(1920)} 1920w, ${u(3840)} 3840w`, alt: 'Your photo' };
  }
  return resolvePhoto(`builtin:${fallback.id}`, blur);
}
export const thumbUrl = (id: string) => id.startsWith('builtin:') ? resolvePhoto(id, true).src : `/media/${id}-960.webp`;

function chosen(a: Appearance, period: string): { id: string; focal?: number[] } {
  const slot = a.slots?.[period];
  const id = slot?.photo ?? DEFAULT_SLOTS[period];
  if (a.rotation === 'fixed' && a.fixed_photo) return { id: a.fixed_photo, focal: slot?.focal as number[] | undefined };
  if (a.rotation === 'shuffle') {
    let k = 0;
    try { const s = sessionStorage.getItem('hl-shuffle'); k = s === null ? Math.floor(Math.random() * 3) : Number(s); sessionStorage.setItem('hl-shuffle', String(k)); } catch { k = 0; }
    const p = PERIODS[k % 3]; const s2 = a.slots?.[p];
    return { id: s2?.photo ?? DEFAULT_SLOTS[p], focal: s2?.focal as number[] | undefined };
  }
  return { id, focal: slot?.focal as number[] | undefined };
}

function putLayer(layer: Element, r: Resolved, first: boolean) {
  const imgs = layer.querySelectorAll('img'), on = layer.querySelector('img.on');
  const n = on && on === imgs[0] ? imgs[1] : imgs[0];
  if (on && on.getAttribute('data-id') === r.src) return;
  const isBlur = layer.hasAttribute('data-blur');
  n.srcset = r.srcset; n.sizes = '100vw'; n.src = r.src; n.setAttribute('data-id', r.src);
  n.alt = isBlur ? '' : r.alt; n.setAttribute('aria-hidden', isBlur ? 'true' : 'false');
  const show = () => { n.classList.add('on'); if (on && on !== n) { on.classList.remove('on'); on.setAttribute('aria-hidden', 'true'); } };
  if (first) show(); else if (n.decode) n.decode().then(show, show); else n.onload = show;
}

let current: Appearance = {};
let backdropInit = false;
export function applyBackdrop(a: Appearance) {
  const period = periodNow(a.windows);
  const pick = chosen(a, period);
  root.setAttribute('data-period', ['morning', 'midday', 'night'].includes(period) ? period : 'night');
  document.querySelectorAll('[data-bd]').forEach((l) => putLayer(l, resolvePhoto(pick.id, l.hasAttribute('data-blur')), false));
  const f = pick.focal;
  if (f && f.length === 2 && f.every((n) => typeof n === 'number')) {
    const pos = `${Math.round(f[0] * 100)}% ${Math.round(f[1] * 100)}%`;
    root.style.setProperty('--pos', pos); root.style.setProperty('--pos-blur', pos);
  } else { root.style.removeProperty('--pos'); root.style.removeProperty('--pos-blur'); }
  backdropInit = true;
}

function applyGlass(a: Appearance) {
  if (typeof a.fog !== 'number') { root.style.removeProperty('--glass'); root.style.removeProperty('--glass-strong'); return; }
  const light = root.getAttribute('data-theme') === 'light';
  const al = light ? 0.4 + a.fog * 0.0052 : 0.3 + a.fog * 0.0046;
  const rgb = light ? '255,255,255' : '18,18,22';
  root.style.setProperty('--glass', `rgba(${rgb},${al.toFixed(3)})`);
  root.style.setProperty('--glass-strong', `rgba(${rgb},${Math.min(0.9, al + 0.06).toFixed(3)})`);
}

export function applyTheme(t: string | undefined) {
  if (t !== 'light' && t !== 'dark' && t !== 'auto') return;
  const v = t === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  root.setAttribute('data-theme', v);
  try { if (t === 'auto') localStorage.removeItem('hl-theme'); else localStorage.setItem('hl-theme', t); } catch { /* ignore */ }
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => { b.setAttribute('aria-pressed', String(v === 'light')); b.setAttribute('aria-label', v === 'light' ? 'Switch to dark mode' : 'Switch to light mode'); });
}

export function applyAppearance(a: Appearance, opts: { theme?: boolean } = {}) {
  current = { ...current, ...a };
  if (opts.theme !== false && a.theme) applyTheme(a.theme);
  if (/^#[0-9a-f]{6}$/i.test(a.accent ?? '')) root.style.setProperty('--accent', a.accent!); else if ('accent' in a) root.style.removeProperty('--accent');
  if (typeof a.blur === 'number') root.style.setProperty('--bd-blur', `${Math.max(0, Math.min(100, a.blur))}px`);
  applyGlass(current);
  applyBackdrop(current);
  // re-check the clock every minute using the user's windows (replaces the default 5/11/18 rule from boot.js)
  const hl = (window as any).hlBackdrop;
  if (hl) hl.tick = () => applyBackdrop(current);
}
// a theme toggle must keep the frosting in step
new MutationObserver(() => applyGlass(current)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
export const isBackdropReady = () => backdropInit;
