// /login/: passkey sign-in, recovery code, continue read-only.
import { api, errText, Offline } from './api';
import { createPasskey as _unused, getAssertion, deviceName, webauthnSupported } from './webauthn';
import { $ } from './dom';
void _unused;

const msg = $('#login-msg')!, go = $('#login-go') as HTMLButtonElement;
const say = (t: string) => { msg.textContent = t; msg.hidden = !t; };
const params = new URLSearchParams(location.search);
const next = (() => { const n = params.get('next') ?? '/'; return n.startsWith('/') && !n.startsWith('//') ? n : '/'; })();

(async () => {
  try {
    const r = await api('/api/session', { timeout: 3000 });
    if (r.data?.signed_in) { location.replace(next); return; }
    if (r.status >= 500) throw new Offline('down');
  } catch { say('Read-only: the control service is offline, so sign-in is not available right now.'); go.disabled = true; }
})();

go.addEventListener('click', async () => {
  say('');
  if (!webauthnSupported()) { say('This browser cannot use passkeys. Open the portal in Safari, Chrome or Edge.'); return; }
  go.disabled = true;
  try {
    const o = await api('/auth/login/options', { body: {} });
    if (!o.ok || !o.data?.options) throw new Error(errText(o));
    const credential = await getAssertion(o.data.options);
    const v = await api('/auth/login/verify', { body: { credential, device_name: deviceName() } });
    if (!v.ok) throw new Error(errText(v, 'That passkey was not accepted.'));
    location.href = next;
  } catch (e: any) {
    say(e instanceof Offline ? 'The control service is offline. Continue read-only for now.' : e?.name === 'NotAllowedError' ? 'Face ID was cancelled. Tap Sign in to try again.' : e?.message || 'Sign-in failed.');
    go.disabled = false;
  }
});

const form = $('#recovery-form') as HTMLFormElement, tog = $('#login-recovery-toggle') as HTMLButtonElement;
tog.addEventListener('click', () => { form.hidden = !form.hidden; tog.setAttribute('aria-expanded', String(!form.hidden)); if (!form.hidden) ($('#recovery-code') as HTMLInputElement).focus(); });
form.addEventListener('submit', async (e) => {
  e.preventDefault(); say('');
  const code = ($('#recovery-code') as HTMLInputElement).value.trim();
  if (!code) { say('Enter one of your recovery codes.'); return; }
  try {
    const r = await api('/auth/recovery', { body: { code } });
    if (!r.ok) throw new Error(errText(r, 'That code was not accepted.'));
    location.href = r.data?.next || '/auth/enroll/';
  } catch (err: any) { say(err instanceof Offline ? 'The control service is offline.' : err.message); }
});
