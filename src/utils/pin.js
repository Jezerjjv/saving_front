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
