import { esc, isNum, num, DASH } from './fmt';
import { ring, bar, stat } from './meters';
import { CATEGORIES, type PublicData } from './types';

const counter = (value: number | null | undefined, label: string, sub: string, decimals = 0, suffix = '') =>
  `<div class="counter"><span class="counter-val num"${isNum(value) ? ` data-count="${value}" data-decimals="${decimals}" data-suffix="${suffix}"` : ''}>${isNum(value) ? value.toFixed(decimals) + suffix : DASH}</span><span class="counter-label">${esc(label)}</span><span class="counter-sub">${esc(sub)}</span></div>`;

export function heroCounters(d: PublicData): string {
  const l = d.lab ?? ({} as PublicData['lab']);
  return [
    counter(l.guests_running, 'guests running', isNum(l.guests_total) ? `of ${l.guests_total} total` : ''),
    counter(l.services_up, 'services up', isNum(l.services_total) ? `of ${l.services_total} monitored` : ''),
    counter(d.uptime_30d?.overall, '30-day uptime', 'across all services', 1, '%'),
    counter(d.ai?.models_available, 'models available', 'on the local GPU'),
  ].join('');
}

export function statusBoard(d: PublicData): string {
  const h = d.host ?? {}, g = d.gpu ?? {}, o = d.ops ?? {}, u = d.uptime_30d ?? {};
  const vramUsed = isNum(g.vram_pct) && isNum(g.vram_total_gb) ? `${((g.vram_pct / 100) * g.vram_total_gb).toFixed(1)} of ${g.vram_total_gb} GB` : isNum(g.vram_total_gb) ? `${g.vram_total_gb} GB total` : '';
  const hostCard = `<article class="card board-card">
    <header><h3>Host</h3><p>${esc(h.role ?? 'Hypervisor')}${h.cpu ? ` &middot; ${esc(h.cpu)}` : ''}</p></header>
    <div class="rings">
      ${ring({ value: h.cpu_pct, label: 'CPU', sub: 'processor load', warnAt: 85 })}
      ${ring({ value: h.mem_pct, label: 'Memory', sub: isNum(h.mem_total_gb) ? `of ${h.mem_total_gb} GB` : '', warnAt: 90 })}
    </div>
    <div class="stat-row">${stat({ label: 'host uptime', value: isNum(h.uptime_days) ? `${num(h.uptime_days)} days` : DASH })}</div>
  </article>`;
  const gpuCard = `<article class="card board-card">
    <header><h3>GPU</h3><p>${esc(g.model ?? 'Accelerator')}</p></header>
    <div class="rings">${ring({ value: g.vram_pct, label: 'VRAM', sub: vramUsed, warnAt: 95 })}</div>
    <div class="meters">
      ${bar({ value: g.temp_c, label: 'Temperature', text: isNum(g.temp_c) ? `${num(g.temp_c)} °C` : DASH, scaleMax: 110, warnAt: 80, badAt: 90 })}
    </div>
  </article>`;
  const cats = CATEGORIES.filter((c) => isNum(u.by_category?.[c.id]));
  const rows = cats.map((c) => {
    const v = u.by_category![c.id] as number;
    const down = Math.round(((100 - v) / 100) * 30 * 24 * 60);
    return bar({ value: v, label: c.label, text: `${v.toFixed(1)}%`, sub: down > 0 ? `about ${down >= 120 ? `${Math.round(down / 60)} h` : `${down} min`} down in 30 days` : 'no downtime', warnAt: undefined });
  }).join('');
  const upCard = `<article class="card board-card wide">
    <header><h3>30-day uptime</h3><p>Overall <strong class="num">${isNum(u.overall) ? u.overall.toFixed(1) + '%' : DASH}</strong>, by category</p></header>
    <div class="meters two">${rows || `<p class="muted">${DASH}</p>`}</div>
  </article>`;
  const age = o.last_backup_age_h;
  const alerts = o.alerts_firing;
  const opsCard = `<article class="card board-card wide">
    <header><h3>Operations</h3><p>How the lab is looked after</p></header>
    <div class="stats">
      ${stat({ label: 'changes this month', value: num(o.changes_this_month) })}
      ${stat({ label: 'decisions recorded', value: num(o.decisions_total) })}
      ${stat({ label: 'last backup', value: isNum(age) ? `${num(age)} h ago` : DASH, tone: isNum(age) && age > 30 ? 'warn' : 'ok' })}
      ${stat({ label: 'last restore test', value: o.last_restore_test_ok === true ? 'Passed' : o.last_restore_test_ok === false ? 'Failed' : DASH, tone: o.last_restore_test_ok === false ? 'bad' : 'ok', icon: o.last_restore_test_ok === true ? 'check' : o.last_restore_test_ok === false ? 'alert' : 'none' })}
      ${stat({ label: 'alerts firing', value: isNum(alerts) ? (alerts === 0 ? 'None' : String(alerts)) : DASH, tone: isNum(alerts) && alerts > 0 ? 'warn' : 'ok', icon: isNum(alerts) ? (alerts === 0 ? 'check' : 'alert') : 'none' })}
    </div>
  </article>`;
  return hostCard + gpuCard + upCard + opsCard;
}
