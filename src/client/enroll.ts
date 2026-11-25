// /auth/enroll/?t=<token>: register a passkey, then show recovery codes once.
import { api, errText, Offline } from './api';
import { createPasskey, deviceName, webauthnSupported } from './webauthn';
import { $, h, toast } from './dom';

const token = new URLSearchParams(location.search).get('t') ?? '';
const show = (id: 'en-start' | 'en-invalid' | 'en-codes') => { for (const k of ['en-start', 'en-invalid', 'en-codes', 'en-loading']) $('#' + k)!.hidden = k !== id; };
const msg = $('#en-msg')!;
const say = (t: string) => { msg.textContent = t; msg.hidden = !t; };
const name = $('#en-name') as HTMLInputElement;
name.value = `${deviceName()} passkey`;

(async () => {
  try {
    const r = await api('/auth/enroll/status' + (token ? `?t=${encodeURIComponent(token)}` : ''));
    if (r.ok && r.data?.valid) show('en-start'); else show('en-invalid');
  } catch (e) { show('en-invalid'); $('#en-invalid .auth-p')!.textContent = e instanceof Offline ? 'The control service is offline. Try again in a minute.' : 'This link is not valid.'; }
})();

$('#en-go')!.addEventListener('click', async (ev) => {
  const btn = ev.currentTarget as HTMLButtonElement; say('');
  if (!webauthnSupported()) { say('This browser cannot create passkeys. Open this link in Safari, Chrome or Edge.'); return; }
  btn.disabled = true;
  try {
    const o = await api('/auth/reg/options', { body: token ? { token } : {} });
    if (!o.ok || !o.data?.options) throw new Error(errText(o));
    const credential = await createPasskey(o.data.options);
    const v = await api('/auth/reg/verify', { body: { ...(token ? { token } : {}), credential, name: name.value.trim() || `${deviceName()} passkey` } });
    if (!v.ok) throw new Error(errText(v, 'The passkey could not be saved.'));
    const codes: string[] | null = v.data?.recovery_codes ?? null;
    if (!codes || !codes.length) { location.href = '/'; return; }
    $('#en-code-list')!.replaceChildren(...codes.map((c) => h('li', null, c)));
    show('en-codes');
  } catch (e: any) {
    say(e instanceof Offline ? 'The control service is offline.' : e?.name === 'NotAllowedError' ? 'The passkey request was cancelled. Tap Register passkey to try again.' : e?.message || 'Registration failed.');
    btn.disabled = false;
  }
});

const saved = $('#en-saved') as HTMLInputElement, done = $('#en-done') as HTMLButtonElement;
saved.addEventListener('change', () => { done.disabled = !saved.checked; });
done.addEventListener('click', async () => {
  done.disabled = true;
  try { const r = await api('/auth/recovery/confirm', { body: {} }); if (!r.ok) throw new Error(errText(r)); location.href = '/'; }
  catch (e: any) { done.disabled = false; toast(e?.message ?? 'Could not confirm.', 'bad'); }
});
