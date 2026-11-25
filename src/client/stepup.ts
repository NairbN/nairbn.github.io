// Step-up flow: POST /auth/stepup/options -> show the sheet with what is being approved -> navigator.credentials.get
// (from the button tap, so iOS allows it) -> POST /auth/stepup/verify -> a single-use token for X-Portal-Stepup.
import { api, errText, Offline, type Res } from './api';
import { getAssertion } from './webauthn';
import { toast } from './dom';

export async function stepUp(action: string, target: string, params: Record<string, unknown> = {}): Promise<string | null> {
  const dlg = document.getElementById('stepup') as HTMLDialogElement | null;
  if (!dlg) return null;
  const summary = document.getElementById('su-summary')!, err = document.getElementById('su-error')!;
  const go = document.getElementById('su-go') as HTMLButtonElement, cancel = document.getElementById('su-cancel') as HTMLButtonElement;
  err.hidden = true;
  let o: Res;
  try { o = await api('/auth/stepup/options', { body: { action, target, params } }); }
  catch (e) { if (e instanceof Offline) { toast('The control service is offline.', 'bad'); return null; } throw e; }
  if (!o.ok || !o.data?.options) { toast(errText(o), 'bad'); return null; }
  summary.textContent = String(o.data.summary ?? `Approve ${action}`);
  go.disabled = false;
  return new Promise<string | null>((resolve) => {
    let done = false;
    const finish = (v: string | null) => { if (done) return; done = true; go.removeEventListener('click', onGo); cancel.removeEventListener('click', onCancel); dlg.removeEventListener('cancel', onCancel); dlg.close(); resolve(v); };
    const onCancel = (e?: Event) => { e?.preventDefault(); finish(null); };
    const onGo = async () => {
      go.disabled = true; err.hidden = true;
      try {
        const cred = await getAssertion(o.data.options);
        const v = await api('/auth/stepup/verify', { body: { credential: cred } });
        if (!v.ok || !v.data?.stepup_token) throw new Error(errText(v, 'Face ID was not accepted.'));
        finish(String(v.data.stepup_token));
      } catch (e) {
        err.textContent = e instanceof Error && e.name !== 'NotAllowedError' ? e.message : 'Face ID was cancelled. Try again or cancel.';
        err.hidden = false; go.disabled = false;
      }
    };
    go.addEventListener('click', onGo); cancel.addEventListener('click', onCancel); dlg.addEventListener('cancel', onCancel);
    dlg.showModal();
  });
}

/** Run a Tier 2 request. With `first: false` we try without a token and step up only if the server asks. */
export async function withStepup(action: string, target: string, params: Record<string, unknown>, send: (token?: string) => Promise<Res>, always = true): Promise<Res | null> {
  if (!always) {
    const r = await send();
    if (!(r.status === 403 && r.data?.error === 'stepup')) return r;
  }
  const token = await stepUp(action, target, params);
  if (!token) return null;
  return send(token);
}
