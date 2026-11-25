import { initSettings, put } from './settings-common';
import { api, errText, Offline } from './api';
import { withStepup, stepUp } from './stepup';
import { createPasskey, deviceName, webauthnSupported } from './webauthn';
import { signOut } from './portal';
import { h, toast, fmtWhen, fmtTime, segmented } from './dom';

initSettings().then(async (c) => {
  if (!c) return;
  let passkeys: any[] = [], sessions: any[] = [], audit: any[] = [], chainOk = true, auditMore = false;
  let idle: number = Number(c.all.security?.session_idle_days ?? 7);
  let codesLeft: number | null = c.all.security?.recovery_codes_left ?? c.all.security?.recovery_remaining ?? null;
  let newCodes: string[] | null = null;
  let renaming: string | null = null;

  const list = async (path: string) => { try { const r = await api(path); return Array.isArray(r.data) ? r.data : r.data?.items ?? r.data?.passkeys ?? r.data?.sessions ?? []; } catch { return []; } };
  const loadAll = async () => { [passkeys, sessions] = await Promise.all([list('/api/security/passkeys'), list('/api/security/sessions')]); };
  async function loadAudit(more = false) {
    try {
      const last = more && audit.length ? `&before=${encodeURIComponent(audit[audit.length - 1].seq)}` : '';
      const r = await api(`/api/audit?limit=20${last}`);
      const items: any[] = r.data?.items ?? [];
      audit = more ? audit.concat(items) : items; chainOk = r.data?.chain_ok !== false; auditMore = items.length >= 20;
    } catch { /* leave as is */ }
  }
  await Promise.all([loadAll(), loadAudit()]);

  const draw = () => {
    const focus = document.activeElement?.id;
    c.root.replaceChildren(passkeyBlock(), sessionBlock(), recoveryBlock(), auditBlock());
    if (focus) document.getElementById(focus)?.focus();
  };

  function passkeyBlock() {
    const rows = passkeys.map((p) => {
      const inp = h('input', { class: 'field', id: `rn-${p.id}`, value: String(p.name ?? ''), maxlength: '40', 'aria-label': 'Passkey name' });
      return h('div', { class: 'pk' },
        h('span', { class: 's-t' }, h('b', null, String(p.name)), h('small', null, `${p.synced ? 'Synced passkey' : 'This device only'}. Added ${fmtWhen(p.created_at)}.${p.last_used_at ? ` Last used ${fmtWhen(p.last_used_at)}.` : ''}`)),
        renaming === p.id ? h('div', { class: 'rename' }, inp, h('button', { type: 'button', class: 'btn-solid', onClick: async () => { const r = await put(`/api/security/passkeys/${encodeURIComponent(p.id)}`, { name: (inp as HTMLInputElement).value.trim() }, { ok: 'Renamed' }); if (r?.ok) { renaming = null; await loadAll(); draw(); } } }, 'Save'), h('button', { type: 'button', class: 'btn-ghost', onClick: () => { renaming = null; draw(); } }, 'Cancel'))
          : h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn-ghost', id: `rnb-${p.id}`, onClick: () => { renaming = p.id; draw(); document.getElementById(`rn-${p.id}`)?.focus(); } }, 'Rename'),
            h('button', { type: 'button', class: 'btn-ghost btn-danger', disabled: passkeys.length < 2, 'aria-label': `Remove ${p.name}`, onClick: async () => {
              const r = await withStepup('settings.passkey.remove', String(p.id), {}, (tok) => put(`/api/security/passkeys/${encodeURIComponent(p.id)}`, undefined, { method: 'DELETE', stepup: tok, ok: 'Passkey removed' }));
              if (r?.ok) { await Promise.all([loadAll(), loadAudit()]); draw(); }
            } }, 'Remove')));
    });
    const name = h('input', { class: 'field', id: 'new-pk', value: `${deviceName()} passkey`, maxlength: '40', 'aria-label': 'Name for the new passkey' });
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-pk' }, h('h2', { id: 'h-pk' }, 'Passkeys'), h('div', null, ...rows),
      h('div', { class: 'rename' }, name, h('button', { type: 'button', class: 'btn-solid', id: 'add-pk', onClick: async () => {
        if (!webauthnSupported()) { toast('This browser cannot create passkeys.', 'bad'); return; }
        const tok = await stepUp('settings.passkey.add', 'new', {}); if (!tok) return;
        try {
          const o = await api('/auth/reg/options', { body: {}, stepup: tok }); if (!o.ok || !o.data?.options) throw new Error(errText(o));
          const credential = await createPasskey(o.data.options);
          const v = await api('/auth/reg/verify', { body: { credential, name: (name as HTMLInputElement).value.trim() || `${deviceName()} passkey` }, stepup: tok });
          if (!v.ok) throw new Error(errText(v)); toast('Passkey added'); await Promise.all([loadAll(), loadAudit()]); draw();
        } catch (e: any) { toast(e instanceof Offline ? 'The control service is offline.' : e?.name === 'NotAllowedError' ? 'The passkey request was cancelled.' : e?.message || 'Could not add the passkey.', 'bad'); }
      } }, 'Add a passkey')),
      h('p', { class: 's-foot' }, passkeys.length < 2 ? 'You can’t remove your last passkey. Add a second one first.' : 'Removing or adding a passkey asks for Face ID.'));
  }

  function sessionBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-se' }, h('h2', { id: 'h-se' }, 'Signed-in devices'),
      h('div', null, ...sessions.map((s) => h('div', { class: 's-row' }, h('span', { class: 's-t' }, h('b', null, String(s.device ?? 'Device'), s.current ? ' (this device)' : ''), h('small', null, s.current ? 'Active now' : `Last used ${fmtWhen(s.last_seen_at)}`))))),
      h('div', { class: 'acts' }, h('button', { type: 'button', class: 'btn-ghost', id: 'revoke', disabled: sessions.filter((s) => !s.current).length === 0, onClick: async () => { const r = await put('/api/security/sessions/revoke-others', {}, { method: 'POST', ok: 'Other devices signed out' }); if (r?.ok) { await Promise.all([loadAll(), loadAudit()]); draw(); } } }, 'Sign out other devices'),
        h('button', { type: 'button', class: 'btn-ghost', onClick: signOut }, 'Sign out this device')),
      h('div', { class: 's-row stack' }, h('b', { id: 'idle-l' }, 'Stay signed in'),
        segmented([['1', '1 day'], ['3', '3 days'], ['7', '7 days'], ['14', '14 days']], String(idle), 'Stay signed in', async (v) => {
          const days = Number(v);
          const r = await withStepup('settings.session.longer', 'security', { days }, (tok) => put('/api/settings/security', { session_idle_days: days }, { stepup: tok, quiet: true }), false);
          if (r?.ok) { idle = days; toast('Saved'); } else draw();
        }), h('small', { class: 'muted' }, `Signs you out after ${idle} ${idle === 1 ? 'day' : 'days'} without use. Longer than today asks for Face ID.`)));
  }

  function recoveryBlock() {
    const body: Node[] = [h('div', { class: 's-row' }, h('span', { class: 's-t' }, h('b', null, codesLeft === null ? 'Recovery codes' : `${codesLeft} codes left`), h('small', null, 'Each code works once. Keep them somewhere offline.')),
      h('button', { type: 'button', class: 'btn-ghost', id: 'regen', onClick: async () => {
        const r = await withStepup('settings.recovery.regenerate', 'recovery', {}, (tok) => put('/api/security/recovery/regenerate', {}, { method: 'POST', stepup: tok, quiet: true }));
        if (r?.ok && Array.isArray(r.data?.recovery_codes)) { newCodes = r.data.recovery_codes; codesLeft = newCodes!.length; await loadAudit(); draw(); }
      } }, 'Regenerate'))];
    if (newCodes) body.push(h('div', { class: 's-row stack' }, h('b', null, 'Your new codes. They are shown only now.'), h('ul', { class: 'codes' }, ...newCodes.map((x) => h('li', null, x))),
      h('button', { type: 'button', class: 'btn-solid', onClick: async () => { await api('/auth/recovery/confirm', { body: {} }).catch(() => null); newCodes = null; draw(); } }, 'I saved them')));
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-rc' }, h('h2', { id: 'h-rc' }, 'Recovery codes'), ...body, h('p', { class: 's-foot' }, 'Regenerating needs Face ID and cancels the old codes.'));
  }

  function auditBlock() {
    return h('section', { class: 's-block glass', 'aria-labelledby': 'h-au' }, h('h2', { id: 'h-au' }, 'Audit log'),
      chainOk ? null : h('p', { class: 'note', role: 'alert' }, 'The audit log failed its integrity check. Treat recent entries with care.'),
      audit.length ? h('ul', { class: 'audit' }, ...audit.map((a) => h('li', null, h('time', { datetime: a.ts }, `${fmtTime(a.ts)} ${new Date(a.ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`),
        h('span', null, `${a.actor ?? ''} ${String(a.action ?? '').replace(/[._]/g, ' ')}${a.target ? ` ${a.target}` : ''}${a.stepup ? ', Face ID' : ''}${a.device ? `, ${a.device}` : ''} `, h('span', { class: a.result === 'ok' ? '' : 'res-bad' }, String(a.result ?? ''))))))
        : h('p', { class: 'muted' }, 'Nothing recorded yet.'),
      auditMore ? h('button', { type: 'button', class: 'btn-ghost', id: 'audit-more', onClick: async () => { await loadAudit(true); draw(); } }, 'Show older entries') : null);
  }
  draw();
});
