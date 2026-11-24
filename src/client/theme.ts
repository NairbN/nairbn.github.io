// Theme toggle. Choice persists in localStorage (all access guarded) and `?theme=dark|light` overrides for previews.
const root = document.documentElement;
const KEY = 'hl-theme';
const current = (): 'dark' | 'light' => {
  const t = root.getAttribute('data-theme');
  if (t === 'dark' || t === 'light') return t;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};
export function initTheme() {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!btn) return;
  const sync = () => {
    const light = current() === 'light';
    btn.setAttribute('aria-pressed', String(light));
    btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
  };
  sync();
  btn.addEventListener('click', () => {
    const next = current() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* storage may be blocked */ }
    sync();
  });
}
