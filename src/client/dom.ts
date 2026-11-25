// Tiny DOM helpers. Everything user-visible from the API goes through textContent, never innerHTML.
type Kid = Node | string | number | null | undefined | false;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, any> | null, ...kids: Kid[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'hidden') (el as any)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat() as Kid[]) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;

export function toast(text: string, kind: 'ok' | 'bad' = 'ok') {
  const host = document.getElementById('toasts');
  if (!host) return;
  const t = h('div', { class: 'toast', 'data-k': kind }, text);
  host.append(t);
  setTimeout(() => t.remove(), kind === 'bad' ? 6000 : 3200);
}

export function svg(path: string): SVGSVGElement {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', path); s.append(p);
  return s;
}

/** Switch (role=switch button). onChange gets the new state. */
export function toggle(on: boolean, label: string, onChange: (v: boolean) => void, disabled = false): HTMLButtonElement {
  const b = h('button', { type: 'button', class: 'sw', role: 'switch', 'aria-checked': String(on), 'aria-label': label, disabled }, h('i'));
  b.addEventListener('click', () => { const v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', String(v)); onChange(v); });
  return b;
}

/** Segmented control. */
export function segmented(opts: [string, string][], value: string, label: string, onChange: (v: string) => void): HTMLElement {
  const wrap = h('div', { class: 'segc', role: 'group', 'aria-label': label });
  const btns = opts.map(([v, text]) => h('button', { type: 'button', 'aria-pressed': String(v === value), onClick: () => { btns.forEach((b, i) => b.setAttribute('aria-pressed', String(opts[i][0] === v))); onChange(v); } }, text));
  wrap.append(...btns);
  return wrap;
}

export const fmtWhen = (iso?: string | null) => {
  if (!iso) return '';
  const t = Date.parse(iso); if (Number.isNaN(t)) return '';
  const m = (Date.now() - t) / 60000;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  if (m < 60 * 24 * 14) return `${Math.round(m / 1440)} d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};
export const fmtTime = (iso?: string | null) => { const t = Date.parse(iso ?? ''); return Number.isNaN(t) ? '' : new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }); };
