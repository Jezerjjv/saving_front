/**
 * Hash del PIN con SHA-256 (solo en cliente). El PIN nunca se guarda en claro.
 * @param {string} pin
 * @returns {Promise<string>} Hash en hex
 */
export async function hashPin(pin) {
  const enc = new TextEncoder();
  const data = enc.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comprueba si el PIN coincide con el hash guardado.
 * @param {string} pin
 * @param {string} storedHash
 * @returns {Promise<boolean>}
 */
export async function verifyPin(pin, storedHash) {
  if (!pin || !storedHash) return false;
  const h = await hashPin(pin);
  return h === storedHash;
}

const SALT = new Uint8Array([83, 97, 118, 105, 110, 103, 80, 73, 78]); // "SavingPIN" bytes

/**
 * Deriva una clave AES-256 desde el PIN para cifrar/descifrar el token.
 * @param {string} pin
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra el token con el PIN (para poder recuperar sesión desde login con PIN).
 * @param {string} token
 * @param {string} pin
 * @returns {Promise<string>} Base64: iv(12) + ciphertext
 */
export async function encryptTokenWithPin(token, pin) {
  if (!token || !pin) return '';
  const key = await deriveKeyFromPin(pin);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(token);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    data
  );
  const combined = new Uint8Array(iv.length + cipher.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipher), iv.length);
  return btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Descifra el token guardado con el PIN.
 * @param {string} encryptedBase64 - Salida de encryptTokenWithPin
 * @param {string} pin
 * @returns {Promise<string|null>} Token o null si falla
 */
export async function decryptTokenWithPin(encryptedBase64, pin) {
  if (!encryptedBase64 || !pin) return null;
  try {
    const str = encryptedBase64.replace(/-/g, '+').replace(/_/g, '/');
    const pad = str.length % 4;
    const padded = pad ? str + '===='.slice(0, 4 - pad) : str;
    const raw = atob(padded);
    const combined = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) combined[i] = raw.charCodeAt(i);
    const iv = combined.slice(0, 12);
    const cipher = combined.slice(12);
    const key = await deriveKeyFromPin(pin);
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      cipher
    );
    return new TextDecoder().decode(dec);
  } catch {
    return null;
  }
}
