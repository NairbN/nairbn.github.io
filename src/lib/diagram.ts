import { esc, DASH } from './fmt';
import { safeStatus, safeCat, type Guest } from './types';

interface LayerSpec { key: string; label: string; }

// Layers, top to bottom, following the request path. Guests are placed by category,
// with two network roles split out by ID (the VPN router and the edge proxy/DNS).
// Anything with an unknown category lands in the last layer, "More".
const LAYERS: LayerSpec[] = [
  { key: 'remote', label: 'Remote access' },
  { key: 'edge', label: 'Edge' },
  { key: 'apps', label: 'Apps' },
  { key: 'obs', label: 'Observability' },
  { key: 'ai', label: 'AI and agents' },
  { key: 'home', label: 'Home' },
  { key: 'more', label: 'More' },
];
const REMOTE_IDS = [151];
const layerOf = (g: Guest): string => {
  if (REMOTE_IDS.includes(g.id)) return 'remote';
  switch (safeCat(g.category)) {
    case 'network': return 'edge';
    case 'apps': case 'infra': return g.id === 120 ? 'edge' : 'apps';
    case 'observability': return 'obs';
    case 'ai': return 'ai';
    case 'home': return 'home';
    default: return 'more';
  }
};

interface Geo { w: number; nodeW: number; nodeH: number; gap: number; x0: number; perRow: number; spineX: number; labelAbove: boolean; top: number; padY: number; frameX: number; }

const WIDE: Geo = { w: 960, nodeW: 164, nodeH: 58, gap: 18, x0: 214, perRow: 4, spineX: 190, labelAbove: false, top: 104, padY: 18, frameX: 16 };
const TALL: Geo = { w: 360, nodeW: 148, nodeH: 58, gap: 10, x0: 34, perRow: 2, spineX: 20, labelAbove: true, top: 100, padY: 12, frameX: 4 };

export function diagram(guests: Guest[], opts: { internal: boolean; orient: 'wide' | 'tall'; hostName?: string }): string {
  const g = opts.orient === 'wide' ? WIDE : TALL;
  const byId = new Map(guests.map((x) => [x.id, x]));
  const layers = LAYERS
    .map((l) => ({ ...l, ids: guests.filter((x) => layerOf(x) === l.key).sort((p, q) => (p.secret ? 1 : 0) - (q.secret ? 1 : 0) || p.id - q.id).map((x) => x.id) }))
    .filter((l) => l.ids.length);

  let y = g.top;
  const placed: { id: number; x: number; y: number; layer: string }[] = [];
  const bands: { y: number; h: number; label: string; key: string }[] = [];
  for (const l of layers) {
    const rows = Math.ceil(l.ids.length / g.perRow);
    const labelH = g.labelAbove ? 22 : 0;
    const h = labelH + rows * g.nodeH + (rows - 1) * g.gap + g.padY * 2;
    bands.push({ y, h, label: l.label, key: l.key });
    l.ids.forEach((id, i) => {
      const r = Math.floor(i / g.perRow);
      const c = i % g.perRow;
      placed.push({ id, x: g.x0 + c * (g.nodeW + g.gap), y: y + labelH + g.padY + r * (g.nodeH + g.gap), layer: l.key });
    });
    y += h + 10;
  }
  const H = y + 10;
  const at = (id: number) => placed.find((p) => p.id === id);
  const frameW = g.w - g.frameX * 2;

  const parts: string[] = [];
  parts.push(`<defs><marker id="arr-${opts.orient}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5L8 5L1 8.5" class="d-arrowhead"/></marker></defs>`);
  // host frame
  const fy = g.top - 30;
  parts.push(`<rect class="d-frame" x="${g.frameX}" y="${fy}" width="${frameW}" height="${H - fy - 6}" rx="22"/>`);
  parts.push(`<text class="d-frame-label" x="${g.w - g.frameX - 18}" text-anchor="end" y="${fy + 22}">${esc(opts.hostName ?? 'Proxmox host')}${opts.internal ? '' : ' (one machine)'}</text>`);
  // internet pill
  const iw = 150;
  const lineX = opts.orient === 'wide' ? g.x0 + g.nodeW / 2 : g.x0 + g.nodeW - 26;
  const ix = lineX - iw / 2;
  parts.push(`<g class="d-ext"><rect x="${ix}" y="6" width="${iw}" height="34" rx="17"/><text x="${ix + iw / 2}" y="28" text-anchor="middle">Internet</text></g>`);
  // bands
  for (const b of bands) {
    parts.push(`<g class="d-band" data-layer="${b.key}"><rect x="${g.frameX + 10}" y="${b.y}" width="${frameW - 20}" height="${b.h}" rx="16"/>` +
      (g.labelAbove ? `<text class="d-layer" x="${g.x0}" y="${b.y + 20}">${esc(b.label)}</text>` : `<text class="d-layer" x="${g.frameX + 30}" y="${b.y + b.h / 2 + 4}">${esc(b.label)}</text>`) + `</g>`);
  }
  const mid = (p: { x: number; y: number }) => ({ cx: p.x + g.nodeW / 2, cy: p.y + g.nodeH / 2 });
  const a = `marker-end="url(#arr-${opts.orient})"`;
  const ed = at(151), gus = at(120), saul = at(153);
  // request path lines (drawn under the nodes)
  if (ed) {
    const m = { cx: lineX, cy: 0 };
    parts.push(`<path class="d-path main" d="M${ix + iw / 2} 40 V${ed.y - 1}" ${a}/>`);
    parts.push(`<text class="d-cap" x="${opts.orient === 'wide' ? lineX + 10 : lineX - 10}" text-anchor="${opts.orient === 'wide' ? 'start' : 'end'}" y="${(40 + ed.y) / 2 + 3}">VPN</text>`);
    if (gus) parts.push(`<path class="d-path main" d="M${m.cx} ${ed.y + g.nodeH} V${gus.y - 1}" ${a}/>`);
  }
  if (gus && saul && saul.y === gus.y) parts.push(`<path class="d-path dns" d="M${saul.x} ${saul.y + g.nodeH / 2} H${gus.x + g.nodeW + 1}" ${a}/>`);
  if (gus) {
    const sy = gus.y + g.nodeH / 2;
    const targets = ['apps', 'obs', 'ai', 'home', 'more'].map((k) => placed.find((p) => p.layer === k)).filter(Boolean) as typeof placed;
    const last = targets.length ? Math.max(...targets.map((t) => t.y + g.nodeH / 2)) : sy;
    parts.push(`<path class="d-path" d="M${gus.x} ${sy} H${g.spineX} V${last}"/>`);
    for (const t of targets) parts.push(`<path class="d-path" d="M${g.spineX} ${t.y + g.nodeH / 2} H${t.x - 1}" ${a}/>`);
  }
  // agents call the inference server
  const todd = at(140);
  for (const aid of [141, 144]) {
    const p = at(aid);
    if (todd && p && p.y === todd.y) {
      const x1 = p.x + g.nodeW / 2, x2 = todd.x + g.nodeW / 2, ty = todd.y;
      parts.push(`<path class="d-path soft" d="M${x1} ${ty} v-9 H${x2} V${ty - 1}" ${a}/>`);
    }
  }
  // nodes
  for (const p of placed) {
    const gu = byId.get(p.id)!;
    const secret = gu.secret === true;
    const st = safeStatus(gu.status);
    const sub = secret ? '' : opts.internal ? gu.ip ?? DASH : gu.role;
    const sr = secret ? `${gu.name}, top secret, classified` : `${gu.name}, ${gu.role}`;
    parts.push(`<g class="d-node${secret ? ' secret' : ''}" data-id="${Math.trunc(Number(p.id))}" data-status="${st}" tabindex="-1"><title>${esc(sr)}</title>` +
      `<rect x="${p.x}" y="${p.y}" width="${g.nodeW}" height="${g.nodeH}" rx="12"/>` +
      `<circle class="d-dot" data-status="${st}" cx="${p.x + 14}" cy="${p.y + 20}" r="4"/>` +
      `<text class="d-name" x="${p.x + 26}" y="${p.y + 24}">${esc(gu.name)}</text>` +
      `<text class="d-sub" x="${p.x + 14}" y="${p.y + 43}">${esc(sub)}</text>` +
      (secret ? `<text class="d-stamp" x="${p.x + 14}" y="${p.y + 43}">TOP SECRET</text>` : '') + `</g>`);
  }
  return `<svg class="diagram diagram-${opts.orient}" viewBox="0 0 ${g.w} ${H}" role="img" aria-label="Architecture: internet, VPN, edge proxy and DNS, apps, observability, AI and agents, home automation, all on one host.">${parts.join('')}</svg>`;
}

export function diagramPair(guests: Guest[], internal: boolean, hostName?: string): string {
  return `<div class="diagram-wrap">${diagram(guests, { internal, orient: 'wide', hostName })}${diagram(guests, { internal, orient: 'tall', hostName })}</div>`;
}
