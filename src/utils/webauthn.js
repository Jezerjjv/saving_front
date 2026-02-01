/**
 * WebAuthn para desbloqueo biométrico (solo cliente).
 * La credencial se registra en el dispositivo; no se verifica en servidor.
 * Las credenciales se almacenan por userId para que cada cuenta tenga la suya.
 */

const BIO_CREDENTIAL_ID_PREFIX = 'saving_bio_credential_id_';
const BIO_CREDENTIAL_ID_KEY_LEGACY = 'saving_bio_credential_id';

function credentialKey(userId) {
  return userId ? `${BIO_CREDENTIAL_ID_PREFIX}${userId}` : null;
}

/** Migra la credencial antigua (global) al formato por usuario, si existe. */
function migrateLegacyCredential(userId) {
  if (!userId) return;
  const legacy = localStorage.getItem(BIO_CREDENTIAL_ID_KEY_LEGACY);
  if (legacy && !localStorage.getItem(credentialKey(userId))) {
    localStorage.setItem(credentialKey(userId), legacy);
    localStorage.removeItem(BIO_CREDENTIAL_ID_KEY_LEGACY);
  }
}

function randomChallenge() {
  return crypto.getRandomValues(new Uint8Array(32));
}

function base64urlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function isWebAuthnAvailable() {
  return typeof window !== 'undefined' && window.PublicKeyCredential != null;
}

/**
 * Indica si el usuario tiene credencial biométrica registrada.
 * @param {string|number|null|undefined} userId - ID del usuario (obligatorio para multi-usuario)
 */
export function hasBiometricCredential(userId) {
  if (userId == null || userId === '') return false;
  migrateLegacyCredential(userId);
  return !!localStorage.getItem(credentialKey(userId));
}

/**
 * Registra una credencial biométrica para este dispositivo.
 * @param {{ id: string, email?: string, name?: string }} user - Datos del usuario para mostrar
 * @returns {Promise<boolean>} true si se registró correctamente
 */
export async function registerBiometric(user) {
  if (!isWebAuthnAvailable()) return false;
  const userId = user?.id || user?.email || 'saving-user';
  const challenge = randomChallenge();
  const publicKey = {
    challenge,
    rp: { name: 'Saving', id: window.location.hostname || 'localhost' },
    user: {
      id: new TextEncoder().encode(userId).buffer,
      name: user?.email || 'usuario',
      displayName: user?.name || user?.email || 'Usuario',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      userVerification: 'required',
      residentKey: 'preferred',
      authenticatorAttachment: 'platform',
    },
    timeout: 60000,
  };
  try {
    const cred = await navigator.credentials.create({ publicKey });
    if (!cred || !cred.rawId) return false;
    const id = base64urlEncode(cred.rawId);
    localStorage.setItem(credentialKey(userId), id);
    return true;
  } catch {
    return false;
  }
}

/**
 * Autentica con biometría (huella/face). No verifica en servidor.
 * @param {string|number|null|undefined} userId - ID del usuario cuya credencial usar
 * @returns {Promise<boolean>} true si el usuario superó la verificación biométrica
 */
export async function authenticateBiometric(userId) {
  if (!isWebAuthnAvailable()) return false;
  if (userId == null || userId === '') return false;
  migrateLegacyCredential(userId);
  const idStr = localStorage.getItem(credentialKey(userId));
  if (!idStr) return false;
  const credentialId = base64urlDecode(idStr);
  const challenge = randomChallenge();
  const publicKey = {
    challenge,
    allowCredentials: [{ type: 'public-key', id: credentialId }],
    userVerification: 'required',
    timeout: 60000,
  };
  try {
    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch {
    return false;
  }
}

/**
 * Elimina la credencial biométrica del usuario.
 * @param {string|number|null|undefined} userId - ID del usuario
 */
export function clearBiometricCredential(userId) {
  if (userId != null && userId !== '') localStorage.removeItem(credentialKey(userId));
}
