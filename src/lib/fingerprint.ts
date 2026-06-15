const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function enrollFingerprint(userId: string, username: string): Promise<{ success: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser. Use Chrome, Edge, or Safari.' };
  }

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'BioAuth', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: 'Fingerprint enrollment was cancelled.' };
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const credentialId = bufferToBase64url(credential.rawId);
    const publicKey = bufferToBase64url(response.getPublicKey?.() || new ArrayBuffer(0));

    const res = await fetch(`${FUNCTIONS_BASE}/fingerprint-enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ user_id: userId, credential_id: credentialId, public_key: publicKey }),
    });

    return res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('NotAllowed') || msg.includes('cancelled') || msg.includes('AbortError')) {
      return { success: false, error: 'Fingerprint enrollment was cancelled or denied.' };
    }
    return { success: false, error: `Fingerprint enrollment failed: ${msg}` };
  }
}

export async function verifyFingerprint(userId: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'WebAuthn is not supported in this browser.' };
  }

  try {
    const credRes = await fetch(`${FUNCTIONS_BASE}/fingerprint-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ user_id: userId, step: 'challenge' }),
    });
    const credData = await credRes.json();

    if (credData.error) return { success: false, error: credData.error };

    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const allowCredentials = [{ id: base64urlToBuffer(credData.credential_id), type: 'public-key' as const }];

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        userVerification: 'required',
        timeout: 60000,
        rpId: window.location.hostname,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) {
      return { success: false, error: 'Fingerprint verification was cancelled.' };
    }

    const verifyRes = await fetch(`${FUNCTIONS_BASE}/fingerprint-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({
        user_id: userId,
        step: 'verify',
        credential_id: bufferToBase64url(assertion.rawId),
      }),
    });

    return verifyRes.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    if (msg.includes('NotAllowed') || msg.includes('AbortError')) {
      return { success: false, error: 'Fingerprint verification was cancelled or denied.' };
    }
    return { success: false, error: `Fingerprint verification failed: ${msg}` };
  }
}
