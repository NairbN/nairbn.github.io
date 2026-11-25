import { initSettings, put } from './settings-common';
import { api, errText, Offline } from './api';
import { withStepup } from './stepup';
import { b64u, deviceName } from './webauthn';
import { h, toast, toggle, segmented, fmtWhen } from './dom';

const EVENTS: [string, string, string][] = [
  ['security', 'Security', 'Sign-ins, new devices, passkey changes. Always on, and it breaks quiet hours.'],
  ['critical', 'Critical', 'A service is down or a disk is nearly full.'],
  ['approvals', 'Approvals', 'An agent is waiting for your decision.'],
  ['jobs', 'My jobs finished', 'Snapshots, backups and restore tests you started.'],
  ['warnings', 'Warnings', 'Checks that fail but do not break anything.'],
  ['digest', 'Weekly digest', 'Sunday at 09:00. One summary of the week.'],
];

initSettings().then(async (c) => {
  if (!c) return;
  const n = c.all.notifications ?? {};
  const events: Record<string, boolean> = { security: true, critical: true, approvals: true, jobs: true, warnings: false, digest: true, ...(n.events ?? {}) };
  const quiet = { enabled: false, from: '22:00', to: '07:00', ...(n.quiet_hours ?? {}) };
  let lock: string = n.lockscreen ?? 'minimal';
  let devices: any[] = [];
  const pushOK = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const saveBody = () => ({ events, quiet_hours: quiet, lockscreen: lock });
  const save = () => put('/api/settings/notifications', saveBody());
  const loadDevices = async () => { try { const r = await api('/api/push/devices'); devices = Array.isArray(r.data) ? r.data : r.data?.devices ?? []; } catch { devices = []; } };
  await loadDevices();

  const draw = () => {
    const focus = document.activeElement?.id;
    c.root.replaceChildren(alertsBlock(), quietBlock(), lockBlock(), devicesBlock());
    if (focus) document.getElementById(focus)?.focus();
  };

  function alertsBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-al' }, h('h2', { id: 'h-al' }, 'Alerts'),
      h('div', null, ...EVENTS.map(([k, label, sub]) => h('div', { class: 's-row' }, h('span', { class: 's-t' }, h('b', null, label), h('small', null, sub)),
        toggle(events[k], label, async (v) => {
          if (k === 'security' && !v) {
            const r = await withStepup('settings.notifications.security_off', 'notifications', {}, (tok) => put('/api/settings/notifications', { events: { ...events, security: false } }, { stepup: tok, quiet: true }), false);
            if (!r || !r.ok) { draw(); return; }
            events.security = false; toast('Saved'); return;
          }
          events[k] = v; save();
        })))));
  }
  function quietBlock() {
    const time = (id: string, label: string, key: 'from' | 'to') => h('input', { type: 'time', class: 'field', id, 'aria-label': label, value: quiet[key], onChange: (e: Event) => { const v = (e.target as HTMLInputElement).value; if (v) { quiet[key] = v; save(); } } });
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-q' }, h('h2', { id: 'h-q' }, 'Quiet hours'),
      h('div', { class: 's-row' }, h('span', { class: 's-t' }, h('b', null, 'Quiet hours'), h('small', null, 'Only Security still comes through.')), toggle(quiet.enabled, 'Quiet hours', (v) => { quiet.enabled = v; save(); })),
      h('div', { class: 's-row' }, h('label', { for: 'q-from' }, 'From'), time('q-from', 'Quiet hours start', 'from'), h('label', { for: 'q-to' }, 'To'), time('q-to', 'Quiet hours end', 'to')));
  }
  function lockBlock() {
    const prev = h('div', { class: 'lock-prev', 'aria-live': 'polite' }, h('b', null, 'Heisenberg Lab'), h('span', null, lock === 'full' ? 'francesca check is failing: the mail check has failed for 9 minutes.' : 'Open Heisenberg Lab for details.'));
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-l' }, h('h2', { id: 'h-l' }, 'On the lock screen'),
      segmented([['minimal', 'Hide details'], ['full', 'Show details']], lock, 'Lock screen', (v) => { lock = v; save(); prev.lastChild!.textContent = v === 'full' ? 'francesca check is failing: the mail check has failed for 9 minutes.' : 'Open Heisenberg Lab for details.'; }), prev);
  }

  async function enable() {
    if (!pushOK) { toast('Push is not available here. On iPhone, open the Home Screen app, not the Safari tab.', 'bad'); return; }
    // The permission prompt happens here, inside the tap handler, and nowhere else.
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notifications are blocked for this site. Allow them in your browser settings.', 'bad'); return; }
    try {
      const reg = (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js', { scope: '/' }));
      await navigator.serviceWorker.ready;
      const k = await api('/push/key');
      if (!k.ok || !k.data?.key) throw new Error(errText(k));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u.toBuf(k.data.key) });
      const j = sub.toJSON();
      const r = await api('/push/subscribe', { body: { subscription: { endpoint: j.endpoint, keys: j.keys }, device_name: deviceName() } });
      if (!r.ok) throw new Error(errText(r));
      toast('Notifications are on for this device'); await loadDevices(); draw();
    } catch (e: any) { toast(e instanceof Offline ? 'The control service is offline.' : e?.message || 'Could not turn on notifications.', 'bad'); }
  }
  async function test(delay: number) {
    try { const r = await api('/push/test', { body: { delay_s: delay } }); toast(r.ok ? (delay ? 'A test push will arrive in 60 seconds. Lock the phone now.' : 'Test push sent.') : errText(r), r.ok ? 'ok' : 'bad'); }
    catch { toast('The control service is offline.', 'bad'); }
  }
  function devicesBlock() {
    const perm = pushOK ? Notification.permission : 'unsupported';
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-d' }, h('h2', { id: 'h-d' }, 'Devices'),
      devices.length ? h('div', null, ...devices.map((d) => h('div', { class: 'dev' }, h('span', { class: 's-t' }, h('b', null, String(d.device ?? 'Device')), h('small', null, d.last_ok_at ? `Last alert ${fmtWhen(d.last_ok_at)}` : `Added ${fmtWhen(d.created_at)}`)),
        h('button', { type: 'button', class: 'btn-ghost btn-danger', 'aria-label': `Remove ${d.device ?? 'device'}`, onClick: async () => { const r = await put(`/api/push/devices/${encodeURIComponent(d.id)}`, undefined, { method: 'DELETE', ok: 'Device removed' }); if (r?.ok) { await loadDevices(); draw(); } } }, 'Remove'))))
        : h('p', { class: 'muted' }, 'No devices yet. Turn notifications on for this one.'),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn-solid', id: 'push-on', onClick: enable }, perm === 'granted' ? 'Re-register this device' : 'Turn on notifications'),
        h('button', { type: 'button', class: 'btn-ghost', id: 'push-test', onClick: () => test(0) }, 'Send test push'), h('button', { type: 'button', class: 'btn-ghost', onClick: () => test(60) }, 'Test in 60 seconds')),
      h('p', { class: 's-foot' }, !pushOK ? 'This browser cannot receive push. On iPhone, add Heisenberg Lab to the Home Screen and open it from there.' : perm === 'denied' ? 'Notifications are blocked for this site in your browser settings.' : 'A test push goes to every device above.'));
  }
  draw();
});
