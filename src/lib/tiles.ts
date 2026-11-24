import { esc, isNum, pct, mb, DASH } from './fmt';
import { CATEGORIES, STATUS_LABEL, safeCat, safeStatus, type Guest } from './types';

const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';

export function legend(): string {
  return `<ul class="legend" aria-label="Categories">${CATEGORIES.map((c) => `<li data-cat="${c.id}"><span class="pip" aria-hidden="true"></span>${esc(c.label)}</li>`).join('')}</ul>`;
}

/** One periodic-table tile. `internal` adds ip / cpu / ram. */
export function tile(g: Guest, internal = false): string {
  const cat = safeCat(g.category);
  const status = safeStatus(g.status);
  const id = isNum(g.id) ? Math.trunc(g.id) : 0;
  const secret = g.secret === true;
  const label = secret
    ? `${id} ${g.name}, top secret, classified`
    : `${id} ${g.name}, ${g.role}, ${catLabel(cat)}, ${STATUS_LABEL[status]}`;
  const meta =
    internal && !secret
      ? `<span class="tile-meta"><span class="num">${esc(g.ip ?? DASH)}</span><span class="num">${isNum(g.cpu_pct) ? pct(g.cpu_pct, 0) : DASH} cpu · ${isNum(g.mem_used_mb) ? mb(g.mem_used_mb) : DASH}</span></span>`
      : '';
  return `<button type="button" class="tile${secret ? ' is-secret' : ''}" data-id="${id}" data-cat="${cat}" data-status="${status}" aria-label="${esc(label)}" aria-pressed="false">
  <span class="tile-top"><span class="tile-num num"${secret ? ' aria-hidden="true"' : ''}>${id}</span><span class="pip" aria-hidden="true"></span></span>
  <span class="tile-sym"${secret ? ' aria-hidden="true"' : ''}>${esc(g.symbol)}</span>
  <span class="tile-name">${esc(g.name)}</span>
  <span class="tile-role">(${esc(secret ? 'top secret' : g.role)})</span>
  ${meta}
  <span class="tile-status"><span class="dot" data-status="${status}" aria-hidden="true"></span>${esc(STATUS_LABEL[status])}</span>
  ${secret ? '<span class="stamp" aria-hidden="true">Top secret</span>' : ''}
</button>`;
}

export function tileGrid(guests: Guest[], internal = false): string {
  return `<div class="tiles" role="group" aria-label="Guests, one tile each">${guests.map((g) => tile(g, internal)).join('')}</div>`;
}
