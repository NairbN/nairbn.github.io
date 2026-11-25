// HTML renderers for the internal portal (same escaping rules as the public views). Nothing here fetches anything.
import { esc, safeUrl, isNum, num, pct, gb, mb, durationS, agoShort, hoursAgo, daysLeft, clampPct, DASH } from './fmt';
import { ringsSvg } from './views';
import { SERVICE_ICONS, CLASSIFIED_ICON, FALLBACK_ICON } from './icons';
import { CATEGORIES, STATUS_LABEL, safeStatus, type Guest, type InternalData, type PublicData } from './types';

const bar = (label: string, text: string, value: number | null | undefined, max = 100, warnAt?: number, badAt?: number) => {
  const has = isNum(value);
  const w = has ? Math.max(0, Math.min(100, ((value as number) / max) * 100)) : 0;
  const state = has && badAt !== undefined && (value as number) >= badAt ? 'bad' : has && warnAt !== undefined && (value as number) >= warnAt ? 'warn' : 'ok';
  return `<div class="mt" data-state="${state}"><div class="mt-h"><span>${esc(label)}</span><b>${esc(text)}</b></div><div class="mt-bar" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${max}" ${has ? `aria-valuenow="${value}"` : ''} aria-valuetext="${esc(text)}"><i class="w${Math.round(w)}"></i></div></div>`;
};
const kvStat = (label: string, value: string, sub = '') => `<div class="ks"><b>${esc(value)}</b><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
const letter = (s: string) => esc((s || '?').trim().charAt(0).toUpperCase());

export function linksHtml(d: InternalData): string {
  const groups = d.links ?? [];
  if (!groups.length) return `<p class="muted">${DASH}</p>`;
  return groups.map((g) => `<section class="lk-group" aria-label="${esc(g.group)}"><h3>${esc(g.group)}</h3><ul>${(g.items ?? []).map((i) =>
    `<li><a class="lk plate" href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener"><span class="lk-i" aria-hidden="true">${letter(i.name)}</span><span class="lk-t"><b>${esc(i.name)}</b><small>${esc(i.description ?? '')}</small></span></a></li>`).join('')}</ul></section>`).join('');
}

export function appsHtml(d: InternalData): string {
  return (d.guests ?? []).map((g) => {
    const st = safeStatus(g.status);
    const classified = g.secret === true || st === 'classified';
    const ic = classified ? CLASSIFIED_ICON : SERVICE_ICONS[String(g.name).toLowerCase()] ?? FALLBACK_ICON;
    const key = String(g.name).toLowerCase().replace(/[^a-z0-9]/g, '');
    const icCls = classified ? 'ic-classified' : SERVICE_ICONS[String(g.name).toLowerCase()] ? `ic-${key}` : 'ic-fallback';
    return `<li><button type="button" class="app svc" data-id="${esc(g.id)}" aria-haspopup="dialog"><span class="svc-ico ${icCls}"><i class="gloss" aria-hidden="true"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ic.d}"/></svg><span class="svc-dot dot" data-s="${st}"></span></span>
<span class="svc-t"><span class="svc-n">${esc(g.name)}</span><span class="svc-r">${esc(g.ip ?? g.role)}</span><span class="sr-only">${esc(g.role)}. Status: ${esc(STATUS_LABEL[st])}</span></span></button></li>`;
  }).join('');
}

export function vitalsHtml(d: InternalData): string {
  const h: any = d.host ?? {}, g: any = d.gpu ?? {};
  const pools = (h.storage ?? []).map((p: any) => {
    const v = isNum(p.used_gb) && isNum(p.total_gb) && p.total_gb > 0 ? (p.used_gb / p.total_gb) * 100 : null;
    return bar(String(p.name ?? 'pool'), `${pct(v)}, ${gb(p.used_gb)} of ${gb(p.total_gb)}`, v, 100, 80, 92);
  }).join('');
  const lg = (c: string, n: string, v: unknown) => `<div class="lg ${c}"><span><i class="swatch"></i>${n}</span><b>${isNum(v) ? Math.round(v) + '%' : DASH}</b></div>`;
  const memTxt = isNum(h.mem_used_gb) && isNum(h.mem_total_gb) ? `${h.mem_used_gb.toFixed(0)} of ${h.mem_total_gb} GB` : isNum(h.mem_total_gb) ? `of ${h.mem_total_gb} GB` : '';
  const vram = isNum(g.vram_used_gb) && isNum(g.vram_total_gb) ? `${g.vram_used_gb.toFixed(1)} of ${g.vram_total_gb} GB` : isNum(g.vram_total_gb) ? `of ${g.vram_total_gb} GB` : '';
  return `<article class="card glass"><header><h3>${esc(h.name ?? 'Host')}</h3><p>${esc(h.ip ?? '')}${h.cpu ? `, ${esc(h.cpu)}` : ''}</p></header>
  <div class="vit-row"><div class="vit-ring">${ringsSvg(d as unknown as PublicData, 150, false)}</div><div class="vit-lg">${lg('c1', 'CPU', h.cpu_pct)}${lg('c2', `Memory${memTxt ? ' (' + memTxt + ')' : ''}`, h.mem_pct)}${lg('c3', `GPU memory${vram ? ' (' + vram + ')' : ''}`, g.vram_pct)}</div></div>
  <div class="ks-row">${kvStat('load, 1 min', num(h.load1, 2))}${kvStat('uptime', isNum(h.uptime_days) ? `${num(h.uptime_days)} d` : DASH)}${kvStat('network in / out', `${num(h.net_rx_mbps, 1)} / ${num(h.net_tx_mbps, 1)}`, 'Mbit/s')}</div>
  <div class="mts">${pools}</div></article>
  <article class="card glass"><header><h3>GPU</h3><p>${esc(g.model ?? '')}${g.host ? `, on ${esc(g.host)}` : ''}</p></header>
  <div class="mts">${bar('VRAM', `${pct(g.vram_pct)}${vram ? ', ' + vram : ''}`, g.vram_pct, 100, 90, 97)}${bar('Temperature', isNum(g.temp_c) ? `${num(g.temp_c)} °C` : DASH, g.temp_c, 110, 80, 90)}${bar('Utilization', pct(g.util_pct), g.util_pct)}${bar('Power', isNum(g.power_w) ? `${num(g.power_w)} W` : DASH, g.power_w, 300)}</div></article>`;
}

export type SortKey = 'id' | 'name' | 'role' | 'status' | 'cpu' | 'ram' | 'uptime' | 'backup' | 'snapshot';
const COLS: { k: SortKey; label: string; num?: boolean }[] = [
  { k: 'id', label: 'ID', num: true }, { k: 'name', label: 'Name' }, { k: 'role', label: 'Role' }, { k: 'status', label: 'Status' },
  { k: 'cpu', label: 'CPU', num: true }, { k: 'ram', label: 'RAM', num: true }, { k: 'uptime', label: 'Uptime', num: true },
  { k: 'backup', label: 'Last backup', num: true }, { k: 'snapshot', label: 'Last snapshot' },
];
const val = (g: Guest, k: SortKey, now: number): string | number | null => {
  switch (k) {
    case 'id': return g.id; case 'name': return g.name; case 'role': return g.role; case 'status': return g.status;
    case 'cpu': return g.cpu_pct ?? null;
    case 'ram': return isNum(g.mem_used_mb) && isNum(g.mem_total_mb) && g.mem_total_mb > 0 ? g.mem_used_mb / g.mem_total_mb : null;
    case 'uptime': return g.uptime_s ?? null; case 'backup': return hoursAgo(g.last_backup_at, now); case 'snapshot': return g.last_snapshot ?? null;
  }
};

export function backupCell(iso: string | null | undefined, now: number): string {
  const h = hoursAgo(iso, now);
  if (h === null) return `<span class="age">${DASH}</span>`;
  const state = h > 50 ? 'bad' : h > 26 ? 'warn' : 'ok';
  const word = state === 'bad' ? ' (overdue)' : state === 'warn' ? ' (late)' : '';
  const txt = h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
  return `<span class="age" data-state="${state}">${state !== 'ok' ? `<span class="dot" data-s="${state}" aria-hidden="true"></span>` : ''}${txt}<span class="sr-only">${word}</span></span>`;
}

export function guestTableHtml(guests: Guest[], sort: { k: SortKey; dir: 1 | -1 }, now = Date.now()): string {
  const rows = guests.slice().sort((a, b) => {
    const va = val(a, sort.k, now), vb = val(b, sort.k, now);
    if (va === null && vb === null) return 0; if (va === null) return 1; if (vb === null) return -1;
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
  });
  const head = COLS.map((c) => `<th scope="col" aria-sort="${sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}"${c.num ? ' class="r"' : ''}><button type="button" data-sort="${c.k}">${c.label}<span class="arrow" aria-hidden="true">${sort.k === c.k ? (sort.dir === 1 ? '↑' : '↓') : ''}</span></button></th>`).join('');
  const body = rows.map((g) => { const st = safeStatus(g.status); return `<tr data-id="${esc(g.id)}" tabindex="0">
    <td class="r">${esc(g.id)}</td><td><b>${esc(g.name)}</b></td><td>${esc(g.role)}</td>
    <td><span class="st"><span class="dot" data-s="${st}" aria-hidden="true"></span>${esc(STATUS_LABEL[st])}</span></td>
    <td class="r">${isNum(g.cpu_pct) ? pct(g.cpu_pct, 1) : DASH}</td>
    <td class="r">${isNum(g.mem_used_mb) ? `${mb(g.mem_used_mb)}${isNum(g.mem_total_mb) ? ` / ${mb(g.mem_total_mb)}` : ''}` : DASH}</td>
    <td class="r">${durationS(g.uptime_s)}</td><td class="r">${backupCell(g.last_backup_at, now)}</td><td>${esc(g.last_snapshot ?? DASH)}</td></tr>`; }).join('');
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Service table, scrolls sideways on small screens"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function checksHtml(d: InternalData): string {
  const s = d.services ?? [];
  if (!s.length) return `<p class="muted">${DASH}</p>`;
  return `<ul class="rows">${s.map((x) => { const st = safeStatus(x.status); return `<li class="row"><span class="st"><span class="dot" data-s="${st}" aria-hidden="true"></span>${esc(STATUS_LABEL[st])}</span>
    <span class="row-n">${x.url ? `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</span>
    <span class="row-v">${isNum(x.uptime_30d) ? x.uptime_30d.toFixed(2) + '%' : DASH}</span><span class="row-v">${isNum(x.latency_ms) ? Math.round(x.latency_ms) + ' ms' : DASH}</span></li>`; }).join('')}</ul>`;
}

export function aiHtml(d: InternalData): string {
  const m = d.ai?.models ?? [];
  const head = `<p class="ai-sum"><b>${num(d.ai?.models_loaded)}</b> loaded of <b>${num(d.ai?.models_available)}</b> available${d.gpu?.host ? `, served from ${esc(d.gpu.host as string)}` : ''}</p>`;
  if (!m.length) return head;
  return head + `<ul class="models">${m.map((x) => `<li><span>${esc(x.id)}</span><span class="badge" data-k="${x.loaded ? 'on' : 'off'}">${x.loaded ? 'Loaded' : 'Idle'}</span></li>`).join('')}</ul>`;
}

const feedList = (items: any[] | undefined, f: (i: any) => string, empty: string) => items && items.length ? `<ul class="feed">${items.map(f).join('')}</ul>` : `<p class="muted">${empty}</p>`;

export function opsAlertsHtml(d: InternalData, now = Date.now()): string {
  const o: any = d.ops ?? {};
  const n = num(o.alerts_firing ?? (o.alerts ?? []).length);
  return `<h2 class="card-h">Alerts firing <span class="count">${n}</span></h2>${feedList(o.alerts, (a) => `<li><span class="dot" data-s="${a.severity === 'critical' ? 'bad' : 'warn'}" aria-hidden="true"></span><span><b>${esc(a.name)}</b> <small>${esc(a.severity)}, since ${agoShort(a.since, now)}</small></span></li>`, 'None firing')}`;
}
export function opsBackupHtml(d: InternalData, now = Date.now()): string {
  const o: any = d.ops ?? {};
  const t = o.last_restore_test;
  return `<h2 class="card-h">Backups</h2>
    <p class="rt-l muted small">Last backup</p><p class="big-v">${isNum(o.last_backup_age_h) ? num(o.last_backup_age_h) + ' h ago' : DASH}</p>
    <p class="rt-l muted small">Last restore test</p>${t ? `<p class="rt"><span class="dot" data-s="${t.ok ? 'up' : 'bad'}" aria-hidden="true"></span><span><b>${t.ok ? 'Passed' : 'Failed'}</b>, ${esc(t.guest)}, ${agoShort(t.at, now)}</span></p>` : `<p class="muted">${DASH}</p>`}
    <p class="muted small">${num(o.changes_this_month)} changes this month, ${num(o.decisions_total)} decisions recorded.</p>`;
}
export function opsChangesHtml(d: InternalData): string {
  return `<h2 class="card-h">Recent changes</h2>${feedList((d.ops as any)?.recent_changes, (c) => `<li><time>${esc(c.date)}</time><span>${esc(c.title)}</span></li>`, DASH)}`;
}
export function opsProposalsHtml(d: InternalData): string {
  return `<h2 class="card-h">Open proposals</h2>${feedList((d.ops as any)?.open_proposals, (c) => `<li><time>${esc(c.date)}</time><span>${esc(c.title)}</span></li>`, 'None open')}`;
}
export function expiryCardHtml(d: InternalData, now = Date.now()): string {
  return `<h2 class="card-h">Expiry watch</h2>${expiryHtml(d, now)}`;
}

/** The four numbers on the Overview. The alerts cell links to the Ops page. */
export function statsHtml(d: InternalData): string {
  const l: any = d.lab ?? {}, o: any = d.ops ?? {};
  const up = d.uptime_30d?.overall;
  const alerts = o.alerts_firing ?? (o.alerts ?? []).length;
  const cell = (v: string, label: string, sub: string, tag = 'div', extra = '') => `<${tag} class="stat"${extra}><span class="stat-v">${esc(v)}</span><span class="stat-l">${esc(label)}</span><span class="stat-s">${esc(sub)}</span></${tag}>`;
  return cell(isNum(l.guests_running) ? String(l.guests_running) : DASH, 'services running', isNum(l.guests_total) ? `of ${l.guests_total}` : '')
    + cell(isNum(l.services_up) ? String(l.services_up) : DASH, 'checks passing', isNum(l.services_total) ? `of ${l.services_total}` : '')
    + cell(isNum(up) ? `${up.toFixed(1)}%` : DASH, '30-day uptime', 'across all checks')
    + cell(isNum(alerts) ? String(alerts) : DASH, 'alerts firing', 'open the ops page', 'a', ` href="/ops/" data-s="${isNum(alerts) && alerts > 0 ? 'warn' : 'ok'}"`);
}

export function expiryHtml(d: InternalData, now = Date.now()): string {
  const e = (d.expiry ?? []).map((x) => ({ ...x, left: daysLeft(x.expires_at, now) })).sort((a, b) => (a.left ?? 1e9) - (b.left ?? 1e9));
  if (!e.length) return `<p class="muted">${DASH}</p>`;
  return `<ul class="rows">${e.map((x) => {
    const l = x.left; const state = l === null ? 'none' : l < 7 ? 'bad' : l < 30 ? 'warn' : 'ok';
    const txt = l === null ? DASH : l < 0 ? `expired ${-l} d ago` : l > 730 ? `${(l / 365).toFixed(1)} y` : `${l} d`;
    const word = state === 'bad' ? 'critical' : state === 'warn' ? 'soon' : '';
    return `<li class="row exp"><span class="st">${state === 'ok' || state === 'none' ? '' : `<span class="dot" data-s="${state}" aria-hidden="true"></span>`}</span><span class="row-n">${esc(x.name)}</span><span class="row-v">${txt}</span><span class="small muted">${word}</span></li>`;
  }).join('')}</ul>`;
}

export function panelHtml(g: Guest, now = Date.now()): string {
  const kv = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const cat = CATEGORIES.find((c) => c.id === g.category)?.label ?? 'Other';
  const st = safeStatus(g.status);
  return `<p class="p-id">${esc(g.id)}</p><h3 id="panel-t">${esc(g.name)}</h3><p class="sheet-sum">${esc(g.role)}</p>
    <p class="st"><span class="dot" data-s="${st}" aria-hidden="true"></span>${esc(STATUS_LABEL[st])}</p>
    <dl class="kv">${kv('Type', g.kind === 'vm' ? 'VM' : g.kind === 'ct' ? 'Container' : DASH)}${kv('Category', esc(cat))}${kv('IP', esc(g.ip ?? DASH))}
      ${kv('URL', g.url ? `<a href="${esc(safeUrl(g.url))}" target="_blank" rel="noopener">${esc(g.url)}</a>` : DASH)}${kv('CPU', isNum(g.cpu_pct) ? pct(g.cpu_pct, 1) : DASH)}
      ${kv('Memory', isNum(g.mem_used_mb) ? `${mb(g.mem_used_mb)} of ${mb(g.mem_total_mb)}` : DASH)}${kv('Uptime', durationS(g.uptime_s))}
      ${kv('Last backup', backupCell(g.last_backup_at, now))}${kv('Last snapshot', esc(g.last_snapshot ?? DASH))}</dl>
    ${g.note ? `<a class="btn-ghost" href="obsidian://open?vault=vault&amp;file=${encodeURIComponent(g.note)}">Open note in Obsidian</a>` : ''}`;
}

export const IRENDER = { statsHtml, linksHtml, appsHtml, vitalsHtml, checksHtml, aiHtml, opsAlertsHtml, opsBackupHtml, opsChangesHtml, opsProposalsHtml, expiryCardHtml } as const;
export { clampPct };
