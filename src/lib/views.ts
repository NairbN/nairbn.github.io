// HTML renderers for the public pages. The same functions run at build time (baked snapshot) and in the browser
// (live refresh), so what you see before and after the live fetch is built the same way. Every dynamic value goes
// through esc(), and enums (status, category) are checked against fixed lists.
import { esc, isNum, DASH, clampPct, ageMinutes } from './fmt';
import { SERVICE_ICONS, SECRET_ICON, FALLBACK_ICON, SECRET_FILL, SPEC_ICONS } from './icons';
import { safeStatus, STATUS_LABEL, type PublicData } from './types';

const R = { 1: 70, 2: 54, 3: 38 } as const;
const circ = (r: number) => 2 * Math.PI * r;
const pctText = (v: unknown) => (isNum(v) ? `${Math.round(v)}%` : DASH);
const f1 = (v: number) => v.toFixed(1);

/** Three concentric activity rings (CPU, memory, GPU memory). Geometry from the approved design. */
export function ringsSvg(d: PublicData, size: number, anim: boolean): string {
  const vals = [d.host?.cpu_pct, d.host?.mem_pct, d.gpu?.vram_pct] as const;
  const label = `CPU ${isNum(vals[0]) ? Math.round(vals[0]) + ' percent' : 'unavailable'}, memory ${isNum(vals[1]) ? Math.round(vals[1]) + ' percent' : 'unavailable'}, GPU memory ${isNum(vals[2]) ? Math.round(vals[2]) + ' percent' : 'unavailable'}`;
  const ring = (i: 1 | 2 | 3) => {
    const r = R[i], c = circ(r), v = vals[i - 1];
    const fill = isNum(v) && clampPct(v) > 0 ? `<circle class="f${i} ring-fill" cx="90" cy="90" r="${r}" stroke-dasharray="${f1((c * clampPct(v)) / 100)} ${f1(c)}"/>` : '';
    return `<circle class="t${i}" cx="90" cy="90" r="${r}"/>${fill}`;
  };
  return `<svg class="ring-svg${anim ? ' anim' : ''}" role="img" aria-label="${esc(label)}" width="${size}" height="${size}" viewBox="0 0 180 180"><g transform="rotate(-90 90 90)" stroke-width="13">${ring(1)}${ring(2)}${ring(3)}</g></svg>`;
}

const legendRow = (cls: string, name: string, v: unknown) =>
  `<div class="lg ${cls}"><span><i class="swatch"></i>${esc(name)}</span><b>${pctText(v)}</b></div>`;

export function pillUpdated(d: PublicData): string {
  const m = ageMinutes(d.generated_at);
  const s = m === null ? 'stale' : m <= 90 ? 'ok' : 'stale';
  return `<span class="dot" data-s="${s}" data-age-dot></span><span>Updated <time data-age datetime="${esc(d.generated_at)}">${esc(d.generated_at.slice(0, 10))}</time></span>`;
}

export function pillRunning(d: PublicData): string {
  const l = d.lab ?? ({} as PublicData['lab']);
  const all = isNum(l.guests_running) && isNum(l.guests_total) && l.guests_running >= l.guests_total;
  return `<span class="dot" data-s="${all ? 'ok' : 'warn'}"></span><span>${isNum(l.guests_running) ? l.guests_running : DASH} of ${isNum(l.guests_total) ? l.guests_total : DASH} running</span>`;
}

export function homeLede(d: PublicData): string {
  const n = isNum(d.lab?.guests_total) ? d.lab.guests_total : '';
  const g = isNum(d.gpu?.vram_total_gb) ? `${d.gpu.vram_total_gb} GB ` : '';
  return `A self-hosted lab: one Proxmox host, ${n ? n + ' services' : 'a set of services'}, local LLM inference on a ${g}GPU, run by AI agents behind guardrails.`;
}

export function homeVitals(d: PublicData, anim = true): string {
  return `<div class="hv-head"><span class="hv-t">Vitals</span><span class="hv-s"><span class="hide-phone">Live from heisenberg</span><span class="show-phone">Live</span></span></div>
  <div class="hv-ring">${ringsSvg(d, 168, anim)}</div>
  <div class="hv-legend">${legendRow('c1', 'CPU', d.host?.cpu_pct)}${legendRow('c2', 'Memory', d.host?.mem_pct)}${legendRow('c3', 'GPU memory', d.gpu?.vram_pct)}</div>`;
}

const statCell = (value: string, label: string, sub: string, labelPhone?: string, subPhone?: string) =>
  `<div class="stat"><div class="stat-v">${esc(value)}</div><div class="stat-l">${labelPhone ? `<span class="hide-phone">${esc(label)}</span><span class="show-phone">${esc(labelPhone)}</span>` : esc(label)}</div><div class="stat-s">${subPhone ? `<span class="hide-phone">${esc(sub)}</span><span class="show-phone">${esc(subPhone)}</span>` : esc(sub)}</div></div>`;

export function homeStats(d: PublicData): string {
  const l = d.lab ?? ({} as PublicData['lab']);
  const up = d.uptime_30d?.overall;
  return [
    statCell(isNum(l.guests_running) ? String(l.guests_running) : DASH, 'services running', isNum(l.guests_total) ? `of ${l.guests_total}` : ''),
    statCell(isNum(l.services_up) ? String(l.services_up) : DASH, 'health checks passing', isNum(l.services_total) ? `of ${l.services_total}` : '', 'checks passing'),
    statCell(isNum(up) ? `${up.toFixed(1)}%` : DASH, '30-day uptime', 'across all checks', undefined, 'all checks'),
    statCell(isNum(d.ai?.models_available) ? String(d.ai.models_available) : DASH, 'local models', isNum(d.gpu?.vram_total_gb) ? `on a ${d.gpu.vram_total_gb} GB GPU` : ''),
  ].join('');
}

const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
export function servicesLede(d: PublicData): string {
  const n = d.lab?.guests_total;
  const w = isNum(n) && Number.isInteger(n) && n >= 0 && n <= 20 ? NUMBER_WORDS[n] : isNum(n) ? String(n) : 'Several';
  return `${w} containers and VMs on one host. Each icon shows the job it does and whether it is up right now.`;
}

export function servicesGrid(d: PublicData): string {
  return (d.guests ?? []).map((g) => {
    const st = safeStatus(g.status);
    const key = String(g.name ?? '').toLowerCase();
    const secret = g.secret === true || st === 'classified';
    const ic = secret ? SECRET_ICON : SERVICE_ICONS[key] ?? FALLBACK_ICON;
    const fill = secret ? SECRET_FILL : `linear-gradient(160deg,${ic.c1} 0%,${ic.c2} 100%)`;
    const word = STATUS_LABEL[st] ?? 'Unknown';
    return `<li class="svc"><div class="svc-ico" style="background:${fill}"><i class="gloss" aria-hidden="true"></i><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ic.d}"/></svg><span class="svc-dot dot" data-s="${st}" title="${esc(word)}"></span></div>
<div class="svc-t"><span class="svc-n">${esc(g.name)}</span><span class="svc-r">${esc(g.role)}</span><span class="sr-only">Status: ${esc(word)}</span></div></li>`;
  }).join('');
}

function cores(d: PublicData): string {
  const m = /(\d+)\s*C\s*\/\s*(\d+)\s*T/i.exec(String(d.host?.cpu ?? ''));
  return m ? `${m[1]} cores, ${m[2]} threads` : '';
}

export function vitalsBig(d: PublicData, anim = true): string {
  const h = d.host ?? {}, g = d.gpu ?? {};
  const block = (cls: string, name: string, v: unknown, sub: string) =>
    `<div class="vb ${cls}"><div class="vb-n"><i class="swatch"></i>${esc(name)}</div><div class="vb-v">${pctText(v)}</div><div class="vb-s">${esc(sub)}</div></div>`;
  const coreTxt = cores(d);
  const gpuSub = [isNum(g.vram_total_gb) ? `of ${g.vram_total_gb} GB` : '', isNum(g.temp_c) ? `${Math.round(g.temp_c)} °C` : ''].filter(Boolean).join(', ');
  return `<div class="vb-ring">${ringsSvg(d, 220, anim)}</div><div class="vb-list">
${block('c1', 'CPU', h.cpu_pct, coreTxt)}${block('c2', 'Memory', h.mem_pct, isNum(h.mem_total_gb) ? `of ${h.mem_total_gb} GB` : '')}${block('c3', 'GPU memory', g.vram_pct, gpuSub)}</div>`;
}

const CAT_ORDER: [string, string, string][] = [
  ['network', 'Network', 'Network'], ['observability', 'Observability', 'Observ.'], ['ai', 'AI', 'AI'], ['home', 'Home', 'Home'], ['apps', 'Apps', 'Apps'], ['infra', 'Infrastructure', 'Infra'],
];
export function vitalsUptime(d: PublicData, anim = true): string {
  const u = d.uptime_30d ?? {};
  const C = circ(26);
  const cats = CAT_ORDER.filter(([id]) => isNum((u.by_category as Record<string, unknown> | undefined)?.[id])).map(([id, name, abbr]) => {
    const v = clampPct((u.by_category as Record<string, number>)[id]);
    return `<li class="uc"><svg class="${anim ? 'anim' : ''}" role="img" aria-label="${esc(name)} ${f1(v)} percent" width="68" height="68" viewBox="0 0 64 64"><g transform="rotate(-90 32 32)" fill="none" stroke-width="7" stroke-linecap="round"><circle class="t1" cx="32" cy="32" r="26"/><circle class="f1 ring-fill" cx="32" cy="32" r="26" stroke-dasharray="${f1((C * v) / 100)} ${f1(C)}"/></g></svg>
<div><div class="uc-v">${f1(v)}%</div><div class="uc-n"><span class="hide-phone">${esc(name)}</span><span class="show-phone">${esc(abbr)}</span></div></div></li>`;
  }).join('');
  const n = d.lab?.services_total;
  return `<div class="up-head"><span class="up-t">30-day uptime</span><span class="up-v">${isNum(u.overall) ? f1(u.overall) + '%' : DASH}</span></div>
<ul class="up-cats">${cats}</ul>
<p class="up-foot">Measured by ${isNum(n) ? n + ' ' : ''}health checks every minute.</p>`;
}

export function vitalsOps(d: PublicData): string {
  const o = d.ops ?? {};
  const age = o.last_backup_age_h;
  const al = o.alerts_firing;
  const rt = o.last_restore_test_ok;
  const cell = (v: string, l: string, extra = '') => `<div class="op${extra}"><div class="op-v">${esc(v)}</div><div class="op-l">${esc(l)}</div></div>`;
  const up = d.host?.uptime_days;
  return [
    cell(isNum(o.changes_this_month) ? String(o.changes_this_month) : DASH, 'changes this month'),
    cell(isNum(o.decisions_total) ? String(o.decisions_total) : DASH, 'decisions recorded'),
    cell(isNum(age) ? `${Math.round(age)} h` : DASH, 'since last backup'),
    cell(rt === true ? 'Passed' : rt === false ? 'Failed' : DASH, 'last restore test'),
    cell(isNum(al) ? (al === 0 ? 'None' : String(al)) : DASH, 'alerts firing'),
    cell(isNum(up) ? `${Math.round(up)} d` : DASH, 'since last reboot', ' show-phone-block'),
  ].join('');
}

export function hardwareLive(d: PublicData): string {
  const g = d.gpu ?? {}, h = d.host ?? {};
  const vram = isNum(g.vram_pct) && isNum(g.vram_total_gb) ? Math.round((g.vram_pct / 100) * g.vram_total_gb) : null;
  const ram = isNum(h.mem_pct) && isNum(h.mem_total_gb) ? Math.round((h.mem_pct / 100) * h.mem_total_gb) : null;
  const cell = (v: string, l: string, lp?: string) => `<div class="lv"><div class="lv-v">${esc(v)}</div><div class="lv-l">${lp ? `<span class="hide-phone">${esc(l)}</span><span class="show-phone">${esc(lp)}</span>` : esc(l)}</div></div>`;
  return [
    cell(isNum(g.temp_c) ? `${Math.round(g.temp_c)} °C` : DASH, 'GPU temperature, live', 'GPU temperature'),
    cell(vram === null ? DASH : `${vram} GB`, `of ${isNum(g.vram_total_gb) ? g.vram_total_gb : DASH} GB VRAM holding models`, `of ${isNum(g.vram_total_gb) ? g.vram_total_gb : DASH} GB VRAM in use`),
    cell(ram === null ? DASH : `${ram} GB`, `of ${isNum(h.mem_total_gb) ? h.mem_total_gb : DASH} GB RAM in use`),
    cell(isNum(h.uptime_days) ? `${Math.round(h.uptime_days)} days` : DASH, 'since the last reboot', 'since last reboot'),
  ].join('');
}

export function hardwareSpecs(d: PublicData): string {
  const h = d.host ?? {}, g = d.gpu ?? {};
  const cpuName = String(h.cpu ?? 'Intel Core i9-7900X (10C/20T)').replace(/\s*\(.*\)\s*$/, '');
  const n = isNum(d.lab?.guests_total) ? d.lab.guests_total : null;
  const mem = '64 GB DDR4'; // fixed hardware fact, not derived from data
  const gpuGb = isNum(g.vram_total_gb) ? g.vram_total_gb : 32;
  const specs: [keyof typeof SPEC_ICONS, string, string, string, string][] = [
    ['cpu', 'Processor', cpuName, `${cores(d) || '10 cores, 20 threads'}. Shared by ${n ?? 'all'} containers and VMs.`, `${cores(d) || '10 cores, 20 threads'}, shared by every service.`],
    ['gpu', 'Graphics', String(g.model ?? 'AMD Radeon AI PRO R9700'), `${gpuGb} GB of GPU memory, handed to one container that serves the local models.`, `${gpuGb} GB of GPU memory serving the local models.`],
    ['mem', 'Memory', mem, 'Quad-channel. The GPU container gets the largest share.', 'Quad-channel; the GPU service gets the biggest share.'],
    ['disk', 'Storage', 'Samsung 9100 PRO 1 TB', 'NVMe SSD with a thin-provisioned pool for every service disk and nightly backups.', 'NVMe SSD for every service disk and nightly backups.'],
    ['net', 'Network', 'Gigabit Ethernet', 'One bridge for all services, default-deny firewall, remote access through a VPN router.', 'Default-deny firewall, remote access over a VPN.'],
    ['os', 'Platform', 'Proxmox VE 9', 'Debian-based hypervisor: 12 LXC containers and 2 VMs, snapshotted before every risky change.', '12 containers and 2 VMs, snapshotted before risky changes.'],
  ];
  return specs.map(([k, label, value, detail, short]) => `<li class="spec glass"><span class="spec-ico" style="background:${SPEC_ICONS[k].tint}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${SPEC_ICONS[k].d}"/></svg></span>
<div class="spec-b"><span class="spec-l">${esc(label)}</span><span class="spec-v">${esc(value)}</span><span class="spec-d"><span class="hide-phone">${esc(detail)}</span><span class="show-phone">${esc(short)}</span></span></div></li>`).join('');
}

/** Slot name -> renderer. Elements with data-render="name" are re-rendered with live data. */
export const RENDERERS: Record<string, (d: PublicData, anim: boolean) => string> = {
  pillUpdated, pillRunning, homeLede, homeVitals, homeStats, servicesLede, servicesGrid, vitalsBig, vitalsUptime, vitalsOps, hardwareLive, hardwareSpecs,
};
