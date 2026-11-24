// Small shared behaviours: scroll reveal, count-up, tile <-> diagram highlighting.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('.reveal');
  if (reduced() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach((e) => io.observe(e));
  // safety net: never leave content hidden
  setTimeout(() => els.forEach((e) => { if (e.getBoundingClientRect().top < innerHeight * 1.2) e.classList.add('in'); }), 1200);
}

export function countUp(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), dec = Number(el.dataset.decimals || 0), suf = el.dataset.suffix || '';
    if (!Number.isFinite(to)) return;
    const fmt = (v: number) => v.toFixed(dec) + suf;
    if (reduced()) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1100;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(to);
    };
    requestAnimationFrame(step);
  });
}

/** Wire tiles to the architecture diagram: hover/focus/tap highlights the matching node.
 *  Uses delegation on a persistent container, so re-rendering the tiles keeps working. */
export function wireHighlight(scope: HTMLElement, onSelect?: (id: number | null) => void) {
  let pinned: string | null = null;
  const tilesEl = () => scope.querySelector<HTMLElement>('.tiles');
  const apply = (id: string | null) => {
    scope.querySelectorAll<SVGElement>('.diagram').forEach((svg) => {
      svg.classList.toggle('has-hl', !!id);
      svg.querySelectorAll('.d-node').forEach((n) => n.classList.toggle('hl', !!id && n.getAttribute('data-id') === id));
    });
    const t = tilesEl();
    if (!t) return;
    t.classList.toggle('has-hl', !!id);
    t.querySelectorAll<HTMLElement>('.tile').forEach((x) => { x.classList.toggle('hl', !!id && x.dataset.id === id); x.setAttribute('aria-pressed', String(!!pinned && x.dataset.id === pinned)); });
  };
  const idOf = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>('.tile')?.dataset.id ?? null;
  scope.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const id = idOf(e); if (id) apply(id); } });
  scope.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && idOf(e)) apply(pinned); });
  scope.addEventListener('focusin', (e) => { const id = idOf(e); if (id) apply(id); });
  scope.addEventListener('focusout', (e) => { if (idOf(e)) apply(pinned); });
  const select = (id: string | null) => {
    if (!id) return;
    pinned = pinned === id ? null : id;
    apply(pinned);
    onSelect?.(pinned ? Number(pinned) : null);
  };
  scope.addEventListener('click', (e) => {
    const tid = idOf(e);
    if (tid) return select(tid);
    const n = (e.target as Element).closest?.('.d-node');
    if (n) select(n.getAttribute('data-id'));
  });
  return { refresh: () => apply(pinned), clear: () => { pinned = null; apply(null); } };
}
