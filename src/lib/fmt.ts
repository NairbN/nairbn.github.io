// Formatting helpers. Every function tolerates null/undefined and returns an em dash.
export const DASH = '—';

export const esc = (v: unknown): string =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export const num = (v: unknown, digits = 0): string => (isNum(v) ? v.toFixed(digits) : DASH);
export const pct = (v: unknown, digits = 0): string => (isNum(v) ? `${v.toFixed(digits)}%` : DASH);
export const clampPct = (v: unknown): number => (isNum(v) ? Math.max(0, Math.min(100, v)) : 0);

export function ageMinutes(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.max(0, (now - t) / 60000);
}

export function agoShort(iso: string | null | undefined, now = Date.now()): string {
  const m = ageMinutes(iso, now);
  if (m === null) return DASH;
  if (m < 1) return 'just now';
  if (m < 60) return `${Math.round(m)} min ago`;
  if (m < 60 * 48) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
}

export function hoursAgo(iso: string | null | undefined, now = Date.now()): number | null {
  const m = ageMinutes(iso, now);
  return m === null ? null : m / 60;
}

export function durationS(s: unknown): string {
  if (!isNum(s)) return DASH;
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function daysLeft(iso: string | null | undefined, now = Date.now()): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : Math.floor((t - now) / 86400000);
}

export function gb(v: unknown, digits = 0): string {
  return isNum(v) ? `${v.toFixed(digits)} GB` : DASH;
}

export function mb(v: unknown): string {
  if (!isNum(v)) return DASH;
  return v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`;
}

export function shortDate(iso: string | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso.length === 7 ? `${iso}-01T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const opts: Intl.DateTimeFormatOptions = iso.length === 7 ? { month: 'short', year: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' };
  return d.toLocaleDateString('en-US', opts);
}

/** Only http(s) URLs may become links; anything else (javascript:, data:) becomes '#'. */
export const safeUrl = (v: unknown): string => (typeof v === 'string' && /^https?:\/\//i.test(v.trim()) ? v.trim() : '#');
