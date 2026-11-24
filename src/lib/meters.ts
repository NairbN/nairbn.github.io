import { esc, clampPct, isNum, DASH } from './fmt';

const R = 44;
const C = 2 * Math.PI * R;

/** Ring gauge. Value and label are real text, so nothing depends on colour or the arc. */
export function ring(opts: { value: number | null | undefined; label: string; text?: string; sub?: string; warnAt?: number }): string {
  const v = clampPct(opts.value);
  const has = isNum(opts.value);
  const warn = has && opts.warnAt !== undefined && v >= opts.warnAt;
  const text = opts.text ?? (has ? `${Math.round(v)}%` : DASH);
  const dash = has ? (C * v) / 100 : 0;
  return `<figure class="ring${warn ? ' is-warn' : ''}" role="img" aria-label="${esc(opts.label)}: ${esc(text)}${warn ? ', high' : ''}">
  <div class="ring-dial"><svg viewBox="0 0 108 108" aria-hidden="true"><circle class="ring-track" cx="54" cy="54" r="${R}"/><circle class="ring-fill" cx="54" cy="54" r="${R}" stroke-dasharray="${dash.toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 54 54)"/></svg>
  <span class="ring-val num">${esc(text)}</span></div>
  <figcaption><strong>${esc(opts.label)}</strong>${opts.sub ? `<span>${esc(opts.sub)}</span>` : ''}</figcaption>
</figure>`;
}

/** Horizontal bar meter with a text value; `scaleMax` maps value to a full bar. */
export function bar(opts: { value: number | null | undefined; label: string; text: string; scaleMax?: number; warnAt?: number; badAt?: number; sub?: string }): string {
  const max = opts.scaleMax ?? 100;
  const has = isNum(opts.value);
  const w = has ? Math.max(0, Math.min(100, ((opts.value as number) / max) * 100)) : 0;
  const state = has && opts.badAt !== undefined && (opts.value as number) >= opts.badAt ? 'bad' : has && opts.warnAt !== undefined && (opts.value as number) >= opts.warnAt ? 'warn' : 'ok';
  return `<div class="meter" data-state="${state}">
  <div class="meter-head"><span>${esc(opts.label)}</span><span class="num">${esc(opts.text)}</span></div>
  <div class="bar" role="meter" aria-label="${esc(opts.label)}" aria-valuemin="0" aria-valuemax="${max}" ${has ? `aria-valuenow="${opts.value}"` : ''} aria-valuetext="${esc(opts.text)}"><span style="width:${w.toFixed(1)}%"></span></div>
  ${opts.sub ? `<div class="meter-sub">${esc(opts.sub)}</div>` : ''}
</div>`;
}

export function stat(opts: { label: string; value: string; sub?: string; tone?: 'ok' | 'warn' | 'bad'; icon?: 'check' | 'alert' | 'none' }): string {
  const icon = opts.icon === 'check' ? '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>' : opts.icon === 'alert' ? '<svg class="ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v6M8 12v.5"/></svg>' : '';
  return `<div class="stat" data-tone="${opts.tone ?? 'ok'}"><div class="stat-val num">${icon}${esc(opts.value)}</div><div class="stat-label">${esc(opts.label)}</div>${opts.sub ? `<div class="stat-sub">${esc(opts.sub)}</div>` : ''}</div>`;
}
