import { initSettings, put, debounce } from './settings-common';
import { applyAppearance, resolvePhoto, thumbUrl, DEFAULT_SLOTS, DEFAULT_WINDOWS, PERIODS, cache, periodNow, type Appearance } from './appearance';
import { BUILTINS } from '../lib/photos';
import { api, errText, Offline } from './api';
import { h, toast, segmented } from './dom';

const LABEL: Record<string, string> = { morning: 'Morning', midday: 'Midday', night: 'Night' };
const ACCENTS: [string, string][] = [['#0a84ff', 'Blue'], ['#30b0c7', 'Teal'], ['#34c759', 'Green'], ['#ff9f0a', 'Orange'], ['#ff375f', 'Pink'], ['#bf5af2', 'Violet'], ['#8e8e93', 'Graphite']];
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 25 * 1024 * 1024;

initSettings().then(async (c) => {
  if (!c) return;
  const a: Appearance = { rotation: 'time', fog: 35, blur: 36, theme: 'auto', accent: '#0a84ff', ...(c.all.appearance ?? {}) };
  a.slots = { ...(a.slots ?? {}) };
  for (const p of PERIODS) a.slots[p] = { photo: DEFAULT_SLOTS[p], focal: [0.5, 0], ...(a.slots[p] ?? {}) } as any;
  a.windows = { ...DEFAULT_WINDOWS, ...(a.windows ?? {}) };
  let sel: string = periodNow(a.windows);
  let library: { hash: string }[] = [];
  try { const r = await api('/api/media'); const l = Array.isArray(r.data) ? r.data : r.data?.photos ?? r.data?.items ?? []; library = l.filter((x: any) => x && typeof x.hash === 'string'); } catch { /* library is optional */ }

  const save = debounce(() => {
    const body = { slots: a.slots, windows: a.windows, rotation: a.rotation, fixed_photo: a.fixed_photo ?? null, fog: a.fog, blur: a.blur, theme: a.theme, accent: a.accent };
    cache(a);
    put('/api/settings/appearance', body, { quiet: true }).then((r) => { if (r?.ok) toast('Saved'); });
  }, 600);
  const change = () => { applyAppearance(a); save(); draw(); };

  const root = c.root;
  const slotPhoto = (p: string) => a.slots![p].photo as string;
  const draw = () => {
    const focus = document.activeElement?.id;
    root.replaceChildren(background(), focalBlock(), windowsBlock(), rotationBlock(), glassBlock(), themeBlock());
    if (focus) document.getElementById(focus)?.focus();
  };

  function background() {
    const slots = h('div', { class: 'slots', role: 'group', 'aria-label': 'Time of day' }, ...PERIODS.map((p) => h('button', { type: 'button', class: 'slot', id: `slot-${p}`, 'aria-pressed': String(sel === p), onClick: () => { sel = p; draw(); } },
      h('span', { class: 'slot-img' }, h('img', { src: thumbUrl(slotPhoto(p)), alt: '' })), h('b', null, LABEL[p]), h('small', null, `From ${a.windows![p]}`))));
    const options = [...BUILTINS.map((b) => ({ id: `builtin:${b.id}`, label: `${b.place} ${b.label.toLowerCase()}` })), ...library.map((l) => ({ id: l.hash, label: 'Yours' }))];
    const grid = h('div', { class: 'pick-grid', role: 'group', 'aria-label': `Photo for ${LABEL[sel].toLowerCase()}` }, ...options.map((o) => h('button', { type: 'button', class: 'pick', 'aria-pressed': String(slotPhoto(sel) === o.id), 'aria-label': o.label, onClick: () => { a.slots![sel].photo = o.id; a.slots![sel].focal = [0.5, 0]; change(); } }, h('img', { src: thumbUrl(o.id), alt: '' }), h('span', null, o.label))));
    const file = h('input', { type: 'file', id: 'photo-file', class: 'file-in', accept: 'image/jpeg,image/png,image/webp', onChange: async () => {
      const f = (file as HTMLInputElement).files?.[0]; if (!f) return;
      if (!ACCEPT.includes(f.type)) { toast('Choose a JPEG, PNG or WebP photo.', 'bad'); return; }
      if (f.size > MAX) { toast('That photo is larger than 25 MB.', 'bad'); return; }
      progress.textContent = 'Uploading…';
      try {
        const r = await api('/api/media', { method: 'POST', raw: f, headers: { 'Content-Type': f.type, 'X-Filename': f.name.slice(0, 120) }, timeout: 60000 });
        if (!r.ok || !r.data?.photo?.hash) throw new Error(errText(r, 'The upload failed.'));
        library.unshift({ hash: r.data.photo.hash });
        a.slots![sel].photo = r.data.photo.hash; a.slots![sel].focal = [0.5, 0.3];
        progress.textContent = ''; change();
      } catch (e: any) { progress.textContent = ''; toast(e instanceof Offline ? 'The control service is offline.' : e.message, 'bad'); }
    } });
    const progress = h('p', { class: 'progress', role: 'status' });
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-bg' }, h('h2', { id: 'h-bg' }, 'Background'), slots,
      h('p', { class: 'sub' }, `Choose a photo for ${LABEL[sel].toLowerCase()}.`), grid,
      h('div', null, file, h('label', { for: 'photo-file', class: 'btn-ghost' }, 'Upload photo')), progress,
      h('p', { class: 's-foot' }, 'Location data is removed from every photo before it is stored.'));
  }

  function focalBlock() {
    const f = (a.slots![sel].focal as number[]) ?? [0.5, 0];
    const dot = h('span', { class: 'focal-dot', 'aria-hidden': 'true' });
    dot.style.left = `${f[0] * 100}%`; dot.style.top = `${f[1] * 100}%`;
    const set = (x: number, y: number) => { a.slots![sel].focal = [Math.max(0, Math.min(1, +x.toFixed(3))), Math.max(0, Math.min(1, +y.toFixed(3)))]; applyAppearance(a); dot.style.left = `${a.slots![sel].focal![0] * 100}%`; dot.style.top = `${a.slots![sel].focal![1] * 100}%`; save(); };
    const btn = h('button', { type: 'button', class: 'focal', id: 'focal', 'aria-label': `Focal point for ${LABEL[sel].toLowerCase()}. Tap the photo, or use the arrow keys.`,
      onClick: (e: MouseEvent) => { const r = btn.getBoundingClientRect(); set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); },
      onKeydown: (e: KeyboardEvent) => { const d: Record<string, [number, number]> = { ArrowLeft: [-0.05, 0], ArrowRight: [0.05, 0], ArrowUp: [0, -0.05], ArrowDown: [0, 0.05] }; const m = d[e.key]; if (!m) return; e.preventDefault(); const cur = a.slots![sel].focal as number[]; set(cur[0] + m[0], cur[1] + m[1]); } },
      h('img', { src: resolvePhoto(slotPhoto(sel), false).src, alt: '' }), dot);
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-focal' }, h('h2', { id: 'h-focal' }, 'Focal point'),
      h('p', { class: 'sub' }, 'Tap to keep the sky. The marked spot stays in view when the photo is cropped to a phone.'), btn);
  }

  function windowsBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-win' }, h('h2', { id: 'h-win' }, 'Time windows'),
      ...PERIODS.map((p) => h('div', { class: 's-row' }, h('div', { class: 's-t' }, h('b', null, LABEL[p]), h('small', null, 'Photo changes at this time')),
        h('input', { type: 'time', class: 'field', 'aria-label': `${LABEL[p]} starts at`, value: a.windows![p], step: '60', onChange: (e: Event) => { const v = (e.target as HTMLInputElement).value; if (v) { a.windows![p] = v; change(); } } }))),
      h('p', { class: 's-foot' }, 'Uses the time on your device.'));
  }

  function rotationBlock() {
    const notes: Record<string, string> = { time: 'The photo follows the time windows above.', shuffle: 'A different photo each time you open the portal.', fixed: 'One photo all day: the one chosen for the selected time.' };
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-rot' }, h('h2', { id: 'h-rot' }, 'Rotation'),
      segmented([['time', 'By time'], ['shuffle', 'Shuffle'], ['fixed', 'One photo']], a.rotation ?? 'time', 'Rotation', (v) => { a.rotation = v as any; a.fixed_photo = v === 'fixed' ? slotPhoto(sel) : null; change(); }),
      h('p', { class: 's-foot' }, notes[a.rotation ?? 'time']));
  }

  function glassBlock() {
    const slider = (id: string, label: string, sub: string, key: 'fog' | 'blur', unit: string) => {
      const out = h('output', { for: id }, `${a[key]}${unit}`);
      const inp = h('input', { type: 'range', class: 'range', id, min: '0', max: '100', step: '1', value: String(a[key]), onInput: (e: Event) => { a[key] = Number((e.target as HTMLInputElement).value); out.textContent = `${a[key]}${unit}`; applyAppearance(a); cache(a); save(); } });
      return h('div', { class: 's-row stack' }, h('label', { class: 'lbl', for: id }, h('span', null, label), out), inp, h('small', { class: 'muted' }, sub));
    };
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-glass' }, h('h2', { id: 'h-glass' }, 'Glass'),
      slider('fog', 'Fog', 'Frosting behind text blocks.', 'fog', '%'), slider('blur', 'Blur', 'Photo blur behind panels.', 'blur', ' px'));
  }

  function themeBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-theme' }, h('h2', { id: 'h-theme' }, 'Theme'),
      segmented([['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']], a.theme ?? 'auto', 'Theme', (v) => { a.theme = v as any; change(); }),
      h('p', { class: 's-foot' }, 'Changes glass and text only. The photo follows the time of day.'),
      h('h2', { id: 'h-acc' }, 'Accent'),
      h('div', { class: 'sw-colors', role: 'group', 'aria-labelledby': 'h-acc' }, ...ACCENTS.map(([hex, name]) => {
        const dot = h('i'); dot.style.background = hex;
        return h('button', { type: 'button', class: 'color', 'aria-label': name, 'aria-pressed': String((a.accent ?? '').toLowerCase() === hex), onClick: () => { a.accent = hex; change(); } }, dot);
      })));
  }
  draw();
});
