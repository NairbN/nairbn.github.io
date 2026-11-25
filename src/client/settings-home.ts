import { initSettings, put, debounce } from './settings-common';
import { FLAGS } from '../lib/flags';
import { h, toggle, svg, toast } from './dom';
import { api } from './api';

const CARDS: Record<string, [string, string]> = {
  vitals: ['Vitals', 'CPU, memory and GPU rings'],
  needs: ['Needs you', 'Failing checks, expiries and setup steps'],
  service_status: ['Lab summary', 'Services running, checks, uptime and alerts'],
  launcher: ['Launcher', 'Your links to dashboards and apps'],
};
const QUICK: [string, string][] = [['restart', 'Restart a service'], ['silence', 'Silence alerts'], ['snapshot', 'Snapshot now'], ['dns_pause', 'Pause DNS blocking']];
const UP = 'M6 15l6-6 6 6', DOWN = 'M6 9l6 6 6-6';

initSettings().then(async (c) => {
  if (!c) return;
  const home = c.all['home'] ?? {};
  let cards: { id: string; visible: boolean }[] = Array.isArray(home.cards) && home.cards.length ? home.cards.filter((x: any) => CARDS[x.id]).map((x: any) => ({ id: x.id, visible: x.visible !== false })) : [];
  for (const id of Object.keys(CARDS)) if (!cards.find((x) => x.id === id)) cards.push({ id, visible: true });
  let quick: string[] = Array.isArray(home.quick_actions) ? home.quick_actions : [];
  let links: { group: string; items: { name: string; url: string; icon?: string }[] }[] = Array.isArray(home.links) && home.links.length ? home.links : [];
  if (!links.length) {
    try { const r = await fetch('/data/internal.json', { cache: 'no-store' }); const d = await r.json(); links = (d.links ?? []).map((g: any) => ({ group: g.group, items: (g.items ?? []).map((i: any) => ({ name: i.name, url: i.url, icon: i.icon })) })); } catch { /* start empty */ }
  }
  const save = debounce(() => { put('/api/settings/home', { cards, quick_actions: quick, links }); }, 500);
  const change = () => { save(); draw(); };

  const draw = () => {
    const focus = document.activeElement?.id;
    const nodes: Node[] = [cardsBlock()];
    if (FLAGS.quickActions) nodes.push(quickBlock());
    nodes.push(linksBlock());
    c.root.replaceChildren(...nodes);
    if (focus) document.getElementById(focus)?.focus();
  };

  function cardsBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-cards' }, h('h2', { id: 'h-cards' }, 'Overview cards'),
      h('div', null, ...cards.map((cd, i) => h('div', { class: 'cardrow' },
        h('span', { class: 's-t' }, h('b', null, CARDS[cd.id][0]), h('small', null, CARDS[cd.id][1])),
        h('button', { type: 'button', class: 'mv', id: `up-${cd.id}`, 'aria-label': `Move ${CARDS[cd.id][0]} up`, disabled: i === 0, onClick: () => { [cards[i - 1], cards[i]] = [cards[i], cards[i - 1]]; change(); } }, svg(UP)),
        h('button', { type: 'button', class: 'mv', id: `dn-${cd.id}`, 'aria-label': `Move ${CARDS[cd.id][0]} down`, disabled: i === cards.length - 1, onClick: () => { [cards[i + 1], cards[i]] = [cards[i], cards[i + 1]]; change(); } }, svg(DOWN)),
        toggle(cd.visible, `Show ${CARDS[cd.id][0]}`, (v) => { cd.visible = v; save(); })))),
      h('p', { class: 's-foot' }, 'Use the arrows to reorder. The switch hides a card.'));
  }

  function quickBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick' }, 'Quick actions'),
      h('div', null, ...QUICK.map(([id, label]) => h('div', { class: 's-row' }, h('span', { class: 's-t' }, h('b', null, label)),
        toggle(quick.includes(id), label, (v) => { quick = v ? [...quick, id] : quick.filter((q) => q !== id); if (quick.length > 4) { quick = quick.slice(0, 4); toast('Four at most. Turn one off to pick another.', 'bad'); } change(); })))),
      h('p', { class: 's-foot' }, `${quick.length} of 4 chosen.`));
  }

  function linksBlock() {
    const grpEls = links.map((g, gi) => {
      const name = h('input', { class: 'field', id: `ln-${gi}`, placeholder: 'Name', maxlength: '40', 'aria-label': `New link name in ${g.group}` });
      const url = h('input', { class: 'field', id: `lu-${gi}`, placeholder: 'Address of the service', inputmode: 'url', autocapitalize: 'none', 'aria-label': `New link address in ${g.group}` });
      return h('div', { class: 'link-grp' }, h('h3', null, g.group),
        ...g.items.map((it, ii) => h('div', { class: 'link-item' }, h('span', null, it.name, h('small', null, it.url)),
          h('button', { type: 'button', class: 'btn-ghost btn-danger', 'aria-label': `Remove ${it.name}`, onClick: () => { g.items.splice(ii, 1); change(); } }, 'Remove'))),
        h('div', { class: 'add-link' }, name, url, h('button', { type: 'button', class: 'btn-ghost', onClick: () => {
          const n = (name as HTMLInputElement).value.trim(), u = (url as HTMLInputElement).value.trim();
          if (!n || !/^https?:\/\//i.test(u)) { toast('Enter a name and an address that starts with https://', 'bad'); return; }
          g.items.push({ name: n, url: u, icon: 'link' }); change();
        } }, 'Add link')));
    });
    const gname = h('input', { class: 'field', id: 'new-group', placeholder: 'Group name', maxlength: '30', 'aria-label': 'New group name' });
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-links' }, h('h2', { id: 'h-links' }, 'Launcher links'), ...grpEls,
      h('div', { class: 'add-link' }, gname, h('span'), h('button', { type: 'button', class: 'btn-ghost', onClick: () => { const n = (gname as HTMLInputElement).value.trim(); if (!n) return; links.push({ group: n, items: [] }); change(); } }, 'Add a group')),
      h('p', { class: 's-foot' }, 'The portal checks each address before it saves. Only your own .home services and LAN addresses are accepted.'));
  }
  draw();
  void api;
});
