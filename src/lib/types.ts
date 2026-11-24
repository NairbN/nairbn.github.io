export type Category = 'infra' | 'apps' | 'observability' | 'ai' | 'network' | 'home';
export type Status = 'up' | 'down' | 'stopped' | 'classified';

export interface Guest {
  id: number;
  symbol: string;
  name: string;
  role: string;
  category: Category;
  status: Status;
  secret: boolean;
  kind?: 'ct' | 'vm';
  ip?: string | null;
  url?: string | null;
  note?: string | null;
  cpu_pct?: number | null;
  mem_used_mb?: number | null;
  mem_total_mb?: number | null;
  uptime_s?: number | null;
  last_backup_at?: string | null;
  last_snapshot?: string | null;
}

export interface PublicData {
  schema_version: number;
  generated_at: string;
  lab: { name: string; guests_total: number; guests_running: number; services_total: number; services_up: number };
  host: { role?: string; cpu?: string; cpu_pct?: number | null; mem_pct?: number | null; mem_total_gb?: number; uptime_days?: number | null; [k: string]: unknown };
  gpu: { model?: string; vram_total_gb?: number; vram_pct?: number | null; temp_c?: number | null; [k: string]: unknown };
  guests: Guest[];
  uptime_30d: { overall?: number | null; by_category?: Partial<Record<Category, number | null>> };
  ai: { models_available?: number | null; [k: string]: unknown };
  ops: { changes_this_month?: number | null; decisions_total?: number | null; last_backup_age_h?: number | null; last_restore_test_ok?: boolean | null; alerts_firing?: number | null; [k: string]: any };
}

/** Internal-only extras: the public schema deliberately omits GPU utilisation and loaded models. */
export interface InternalData extends Omit<PublicData, 'gpu' | 'ai'> {
  gpu: PublicData['gpu'] & { util_pct?: number | null };
  ai: PublicData['ai'] & { models_loaded?: number | null; models?: { id: string; loaded: boolean }[] };
  services?: { name: string; url?: string | null; category?: Category; status: string; uptime_30d?: number | null; latency_ms?: number | null }[];
  expiry?: { name: string; expires_at: string }[];
  links?: { group: string; items: { name: string; url: string; description?: string; icon?: string }[] }[];
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'infra', label: 'Infrastructure' },
  { id: 'apps', label: 'Apps' },
  { id: 'observability', label: 'Observability' },
  { id: 'ai', label: 'AI' },
  { id: 'network', label: 'Network' },
  { id: 'home', label: 'Home' },
];

export const STATUS_LABEL: Record<string, string> = { up: 'Running', down: 'Down', stopped: 'Stopped', classified: 'Classified' };

export const STATUSES: readonly string[] = ['up', 'down', 'stopped', 'classified'];
export const CATEGORY_IDS: readonly string[] = CATEGORIES.map((c) => c.id);
STATUS_LABEL.unknown = 'Unknown';

/** Enum guards: anything unexpected from JSON becomes the neutral 'unknown'. */
export const safeStatus = (v: unknown): Status | 'unknown' => (typeof v === 'string' && STATUSES.includes(v) ? (v as Status) : 'unknown');
export const safeCat = (v: unknown): Category | 'unknown' => (typeof v === 'string' && CATEGORY_IDS.includes(v) ? (v as Category) : 'unknown');
