// Same-origin API client for lydia (see system/lab-portal/v2/API.md). Every state-changing call sends X-Portal: 1.
export interface Res<T = any> { status: number; ok: boolean; data: T }
export class Offline extends Error {}

export async function api<T = any>(path: string, o: { method?: string; body?: unknown; raw?: BodyInit; headers?: Record<string, string>; timeout?: number; stepup?: string } = {}): Promise<Res<T>> {
  const method = o.method ?? (o.body !== undefined || o.raw !== undefined ? 'POST' : 'GET');
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  let body: BodyInit | undefined;
  if (method !== 'GET') headers['X-Portal'] = '1';
  if (o.stepup) headers['X-Portal-Stepup'] = o.stepup;
  if (o.raw !== undefined) body = o.raw;
  else if (method !== 'GET') { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body ?? {}); }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeout ?? 8000);
  try {
    const r = await fetch(path, { method, headers, body, credentials: 'same-origin', signal: ctl.signal, cache: 'no-store' });
    let data: any = null;
    try { data = await r.json(); } catch { data = null; }
    return { status: r.status, ok: r.ok && (data?.ok !== false), data };
  } catch (e) {
    throw new Offline(e instanceof Error ? e.message : 'offline');
  } finally { clearTimeout(timer); }
}

export const errText = (r: Res | null, fallback = 'Something went wrong. Try again.') =>
  (r?.data && (r.data.message || r.data.error)) ? String(r.data.message || r.data.error) : fallback;
