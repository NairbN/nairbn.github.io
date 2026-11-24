// Behaviour shared by the public site and the internal portal: theme toggle, time-of-day backdrop, "More" menu.
const root = document.documentElement;
const KEY = 'hl-theme';
const current = (): 'dark' | 'light' => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

export function initTheme() {
  const btns = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  const sync = () => {
    const light = current() === 'light';
    btns.forEach((b) => {
      b.setAttribute('aria-pressed', String(light));
      b.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    });
  };
  sync();
  btns.forEach((b) => b.addEventListener('click', () => {
    const next = current() === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* storage may be blocked */ }
    sync();
  }));
}

/** The inline head script owns the first paint; here we only re-check the clock once a minute. */
export function initBackdrop() {
  const tick = () => (window as any).hlBackdrop?.tick?.();
  setInterval(tick, 60_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
}

export function initMore() {
  const more = document.querySelector<HTMLDetailsElement>('[data-more]');
  if (!more) return;
  document.addEventListener('click', (e) => { if (more.open && !more.contains(e.target as Node)) more.open = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && more.open) { more.open = false; more.querySelector('summary')?.focus(); } });
}

export function initShell() { initTheme(); initBackdrop(); initMore(); }
