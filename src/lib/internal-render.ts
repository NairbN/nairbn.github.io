import { esc, safeUrl, isNum, num, pct, gb, mb, durationS, agoShort, hoursAgo, daysLeft, DASH } from './fmt';
import { ring, bar, stat } from './meters';
import { CATEGORIES, STATUS_LABEL, safeStatus, type Guest, type InternalData } from './types';

const letter = (s: string) => esc((s || '?').trim().charAt(0).toUpperCase());

export function linksHtml(d: InternalData): string {
  const groups = d.links ?? [];
  if (!groups.length) return `<p class="muted">${DASH}</p>`;
  return groups.map((g) => `<div class="link-group"><h3>${esc(g.group)}</h3><ul>${(g.items ?? []).map((i) =>
    `<li><a class="link-card" href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener"><span class="link-ico" aria-hidden="true">${letter(i.name)}</span><span class="link-txt"><strong>${esc(i.name)}</strong><small>${esc(i.description ?? '')}</small></span></a></li>`).join('')}</ul></div>`).join('');
}

export function vitalsHtml(d: InternalData): string {
  const h: any = d.host ?? {}, g: any = d.gpu ?? {};
  const pools = (h.storage ?? []).map((p: any) => {
    const v = isNum(p.used_gb) && isNum(p.total_gb) && p.total_gb > 0 ? (p.used_gb / p.total_gb) * 100 : null;
    return bar({ value: v, label: p.name, text: `${pct(v)} · ${gb(p.used_gb)} of ${gb(p.total_gb)}`, warnAt: 80, badAt: 92 });
  }).join('');
  const memTxt = isNum(h.mem_used_gb) && isNum(h.mem_total_gb) ? `${h.mem_used_gb.toFixed(0)} of ${h.mem_total_gb} GB` : isNum(h.mem_total_gb) ? `of ${h.mem_total_gb} GB` : '';
  const vram = isNum(g.vram_used_gb) && isNum(g.vram_total_gb) ? `${g.vram_used_gb.toFixed(1)} of ${g.vram_total_gb} GB` : '';
  return `<article class="card vit">
    <header><h3>${esc(h.name ?? 'Host')}</h3><p class="num">${esc(h.ip ?? '')}${h.cpu ? ` · ${esc(h.cpu)}` : ''}</p></header>
    <div class="rings">${ring({ value: h.cpu_pct, label: 'CPU', warnAt: 85 })}${ring({ value: h.mem_pct, label: 'Memory', sub: memTxt, warnAt: 90 })}</div>
    <div class="stats s3">
      ${stat({ label: 'load (1 min)', value: num(h.load1, 2) })}
      ${stat({ label: 'uptime', value: isNum(h.uptime_days) ? `${num(h.uptime_days)} d` : DASH })}
      ${stat({ label: 'network in / out', value: `${num(h.net_rx_mbps, 1)} / ${num(h.net_tx_mbps, 1)}`, sub: 'Mbit/s' })}
    </div>
    <div class="meters">${pools || ''}</div>
  </article>
  <article class="card vit">
    <header><h3>GPU</h3><p>${esc(g.model ?? '')}${g.host ? ` · on ${esc(g.host)}` : ''}</p></header>
    <div class="rings">${ring({ value: g.vram_pct, label: 'VRAM', sub: vram, warnAt: 95 })}</div>
    <div class="meters">
      ${bar({ value: g.temp_c, label: 'Temperature', text: isNum(g.temp_c) ? `${num(g.temp_c)} °C` : DASH, scaleMax: 110, warnAt: 80, badAt: 90 })}
      ${bar({ value: g.util_pct, label: 'Utilisation', text: pct(g.util_pct) })}
      ${bar({ value: g.power_w, label: 'Power', text: isNum(g.power_w) ? `${num(g.power_w)} W` : DASH, scaleMax: 300 })}
    </div>
  </article>`;
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
  if (h === null) return `<span class="age" data-state="none">${DASH}</span>`;
  const state = h > 50 ? 'bad' : h > 26 ? 'warn' : 'ok';
  const word = state === 'bad' ? ' (overdue)' : state === 'warn' ? ' (late)' : '';
  const txt = h < 48 ? `${Math.round(h)} h` : `${Math.round(h / 24)} d`;
  return `<span class="age" data-state="${state}">${state !== 'ok' ? `<span class="dot" data-status="${state}" aria-hidden="true"></span>` : ''}<span class="num">${txt}</span><span class="sr-only">${word}</span></span>`;
}

export function guestTableHtml(guests: Guest[], sort: { k: SortKey; dir: 1 | -1 }, now = Date.now()): string {
  const rows = guests.filter((g) => !g.secret || true).slice().sort((a, b) => {
    const va = val(a, sort.k, now), vb = val(b, sort.k, now);
    if (va === null && vb === null) return 0; if (va === null) return 1; if (vb === null) return -1;
    return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir;
  });
  const head = COLS.map((c) => `<th scope="col" aria-sort="${sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}"${c.num ? ' class="r"' : ''}><button type="button" data-sort="${c.k}">${c.label}<span class="arrow" aria-hidden="true">${sort.k === c.k ? (sort.dir === 1 ? '↑' : '↓') : ''}</span></button></th>`).join('');
  const body = rows.map((g) => `<tr data-id="${esc(g.id)}" tabindex="0">
    <td class="num r">${esc(g.id)}</td><td><strong>${esc(g.name)}</strong></td><td>${esc(g.role)}</td>
    <td><span class="st" data-status="${safeStatus(g.status)}"><span class="dot" data-status="${safeStatus(g.status)}" aria-hidden="true"></span>${esc(STATUS_LABEL[safeStatus(g.status)])}</span></td>
    <td class="num r">${isNum(g.cpu_pct) ? pct(g.cpu_pct, 1) : DASH}</td>
    <td class="num r">${isNum(g.mem_used_mb) ? `${mb(g.mem_used_mb)}${isNum(g.mem_total_mb) ? ` / ${mb(g.mem_total_mb)}` : ''}` : DASH}</td>
    <td class="num r">${durationS(g.uptime_s)}</td>
    <td class="r">${backupCell(g.last_backup_at, now)}</td>
    <td class="num snap">${esc(g.last_snapshot ?? DASH)}</td></tr>`).join('');
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="Guest table, scrolls sideways on small screens"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

export function servicesHtml(d: InternalData): string {
  const s = d.services ?? [];
  if (!s.length) return `<p class="muted">${DASH}</p>`;
  return `<ul class="rows">${s.map((x) => `<li class="row">
    <span class="st" data-status="${esc(x.status)}"><span class="dot" data-status="${esc(x.status)}" aria-hidden="true"></span>${esc(x.status === 'up' ? 'Up' : x.status === 'down' ? 'Down' : x.status)}</span>
    <span class="row-name">${x.url ? `<a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.name)}</a>` : esc(x.name)}</span>
    <span class="num row-v">${isNum(x.uptime_30d) ? x.uptime_30d.toFixed(2) + '%' : DASH}</span>
    <span class="num row-v">${isNum(x.latency_ms) ? Math.round(x.latency_ms) + ' ms' : DASH}</span></li>`).join('')}</ul>`;
}

export function aiHtml(d: InternalData): string {
  const m = d.ai?.models ?? [];
  const head = `<p class="ai-sum"><span class="num">${num(d.ai?.models_loaded)}</span> loaded of <span class="num">${num(d.ai?.models_available)}</span> available${d.gpu?.host ? ` · served from ${esc(d.gpu.host as string)}` : ''}</p>`;
  if (!m.length) return head;
  return head + `<ul class="models">${m.map((x) => `<li><span class="num">${esc(x.id)}</span><span class="badge" data-on="${x.loaded === true}">${x.loaded ? 'Loaded' : 'Idle'}</span></li>`).join('')}</ul>`;
}

export function opsHtml(d: InternalData, now = Date.now()): string {
  const o: any = d.ops ?? {};
  const list = (items: any[] | undefined, f: (i: any) => string, empty: string) => items && items.length ? `<ul class="feed">${items.map(f).join('')}</ul>` : `<p class="muted">${empty}</p>`;
  const t = o.last_restore_test;
  const alerts = list(o.alerts, (a) => `<li><span class="dot" data-status="${a.severity === 'critical' ? 'bad' : 'warn'}" aria-hidden="true"></span><span><strong>${esc(a.name)}</strong> <small>${esc(a.severity)} · since ${agoShort(a.since, now)}</small></span></li>`, 'None firing');
  return `<div class="ops-grid">
    <section><h4>Alerts firing <span class="count num">${num(o.alerts_firing ?? (o.alerts ?? []).length)}</span></h4>${alerts}</section>
    <section><h4>Last restore test</h4>${t ? `<p class="rt"><span class="dot" data-status="${t.ok ? 'up' : 'bad'}" aria-hidden="true"></span><strong>${t.ok ? 'Passed' : 'Failed'}</strong> · ${esc(t.guest)} · <span class="num">${agoShort(t.at, now)}</span></p>` : `<p class="muted">${DASH}</p>`}
      <p class="muted small">Last backup <span class="num">${isNum(o.last_backup_age_h) ? num(o.last_backup_age_h) + ' h ago' : DASH}</span> · <span class="num">${num(o.changes_this_month)}</span> changes this month · <span class="num">${num(o.decisions_total)}</span> decisions</p></section>
    <section><h4>Recent changes</h4>${list(o.recent_changes, (c) => `<li><time class="num">${esc(c.date)}</time><span>${esc(c.title)}</span></li>`, DASH)}</section>
    <section><h4>Open proposals</h4>${list(o.open_proposals, (c) => `<li><time class="num">${esc(c.date)}</time><span>${esc(c.title)}</span></li>`, 'None open')}</section>
  </div>`;
}

export function expiryHtml(d: InternalData, now = Date.now()): string {
  const e = (d.expiry ?? []).map((x) => ({ ...x, left: daysLeft(x.expires_at, now) })).sort((a, b) => (a.left ?? 1e9) - (b.left ?? 1e9));
  if (!e.length) return `<p class="muted">${DASH}</p>`;
  return `<ul class="rows">${e.map((x) => {
    const l = x.left; const state = l === null ? 'none' : l < 0 ? 'bad' : l < 7 ? 'bad' : l < 30 ? 'warn' : 'ok';
    const txt = l === null ? DASH : l < 0 ? `expired ${-l} d ago` : l > 730 ? `${(l / 365).toFixed(1)} y` : `${l} d`;
    const word = state === 'bad' ? 'critical' : state === 'warn' ? 'soon' : '';
    return `<li class="row exp" data-state="${state}"><span class="st">${state === 'ok' || state === 'none' ? '' : `<span class="dot" data-status="${state}" aria-hidden="true"></span>`}</span><span class="row-name">${esc(x.name)}</span><span class="num row-v">${txt}</span><span class="small muted">${word}</span></li>`;
  }).join('')}</ul>`;
}

export function panelHtml(g: Guest, now = Date.now()): string {
  const kv = (k: string, v: string) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
  const cat = CATEGORIES.find((c) => c.id === g.category)?.label ?? 'Other';
  return `<header><p class="num p-id">${esc(g.id)}</p><h3>${esc(g.name)}</h3><p>${esc(g.role)}</p>
    <p class="st" data-status="${safeStatus(g.status)}"><span class="dot" data-status="${safeStatus(g.status)}" aria-hidden="true"></span>${esc(STATUS_LABEL[safeStatus(g.status)])}</p></header>
    <dl class="kv">
      ${kv('Type', g.kind === 'vm' ? 'VM' : g.kind === 'ct' ? 'Container' : DASH)}
      ${kv('Category', esc(cat))}
      ${kv('IP', `<span class="num">${esc(g.ip ?? DASH)}</span>`)}
      ${kv('URL', g.url ? `<a href="${esc(safeUrl(g.url))}" target="_blank" rel="noopener">${esc(g.url)}</a>` : DASH)}
      ${kv('CPU', isNum(g.cpu_pct) ? pct(g.cpu_pct, 1) : DASH)}
      ${kv('Memory', isNum(g.mem_used_mb) ? `${mb(g.mem_used_mb)} of ${mb(g.mem_total_mb)}` : DASH)}
      ${kv('Uptime', durationS(g.uptime_s))}
      ${kv('Last backup', backupCell(g.last_backup_at, now))}
      ${kv('Last snapshot', `<span class="num">${esc(g.last_snapshot ?? DASH)}</span>`)}
    </dl>
    ${g.note ? `<a class="btn" href="obsidian://open?vault=vault&amp;file=${encodeURIComponent(g.note)}">Open note in Obsidian</a>` : ''}`;
}
