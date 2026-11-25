// WebAuthn browser helpers (pattern from v2/spike/static/app.js). Options and credentials travel as base64url JSON.
const b64uToBuf = (s: string): ArrayBuffer => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};
const bufToB64u = (buf: ArrayBuffer): string => {
  const b = new Uint8Array(buf); let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const webauthnSupported = () => !!(window.PublicKeyCredential && navigator.credentials);

export async function createPasskey(opts: any): Promise<any> {
  const o = opts.publicKey ?? opts;
  o.challenge = b64uToBuf(o.challenge);
  o.user.id = b64uToBuf(o.user.id);
  (o.excludeCredentials ?? []).forEach((c: any) => { c.id = b64uToBuf(c.id); });
  const c = (await navigator.credentials.create({ publicKey: o })) as PublicKeyCredential | null;
  if (!c) throw new Error('cancelled');
  const r = c.response as AuthenticatorAttestationResponse;
  return {
    id: c.id, rawId: bufToB64u(c.rawId), type: c.type, authenticatorAttachment: (c as any).authenticatorAttachment || undefined,
    clientExtensionResults: {},
    response: { clientDataJSON: bufToB64u(r.clientDataJSON), attestationObject: bufToB64u(r.attestationObject), transports: r.getTransports ? r.getTransports() : [] },
  };
}

export async function getAssertion(opts: any): Promise<any> {
  const o = opts.publicKey ?? opts;
  o.challenge = b64uToBuf(o.challenge);
  (o.allowCredentials ?? []).forEach((c: any) => { c.id = b64uToBuf(c.id); });
  const c = (await navigator.credentials.get({ publicKey: o })) as PublicKeyCredential | null;
  if (!c) throw new Error('cancelled');
  const r = c.response as AuthenticatorAssertionResponse;
  return {
    id: c.id, rawId: bufToB64u(c.rawId), type: c.type, authenticatorAttachment: (c as any).authenticatorAttachment || undefined,
    clientExtensionResults: {},
    response: { clientDataJSON: bufToB64u(r.clientDataJSON), authenticatorData: bufToB64u(r.authenticatorData), signature: bufToB64u(r.signature), userHandle: r.userHandle ? bufToB64u(r.userHandle) : undefined },
  };
}

export const b64u = { toBuf: b64uToBuf, fromBuf: bufToB64u };
/** A friendly default name from the user agent, used as `device_name` / passkey name. */
export function deviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux PC';
  return 'This device';
}
