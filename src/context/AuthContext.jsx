import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { hashPin, verifyPin, encryptTokenWithPin, decryptTokenWithPin } from '../utils/pin';
import { hasBiometricCredential } from '../utils/webauthn';
import { api } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'saving_token';
const USER_KEY = 'saving_user';
const USER_ID_PIN_KEY = 'saving_user_id';
const PIN_ENABLED_KEY = 'saving_pin_enabled';
const PIN_HASH_KEY = 'saving_pin_hash';
const ENCRYPTED_TOKEN_KEY = 'saving_encrypted_token';

function getPinEnabled() {
  return localStorage.getItem(PIN_ENABLED_KEY) === 'true';
}

function getStoredPinHash() {
  return localStorage.getItem(PIN_HASH_KEY) || '';
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  // Bloqueado si hay token y (PIN activado O biometría del usuario actual) hasta que el usuario desbloquee
  const [unlocked, setUnlocked] = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return true;
    try {
      const u = localStorage.getItem(USER_KEY);
      const currentUser = u ? JSON.parse(u) : null;
      const pinOn = currentUser?.pin_enabled ?? getPinEnabled();
      const bioOn = currentUser?.bio_enabled && hasBiometricCredential(currentUser?.id);
      return !(pinOn || bioOn);
    } catch {
      return !(getPinEnabled() || hasBiometricCredential(null));
    }
  });

  // Fuente de verdad: API (user.pin_enabled). Fallback a localStorage para sesiones antiguas.
  const pinEnabled = user?.pin_enabled ?? getPinEnabled();

  // Al cargar con token, sincronizar user con API para tener pin_enabled y bio_enabled actualizados.
  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return;
    api.auth.getMe()
      .then((fresh) => {
        if (fresh.pin_hash) {
          localStorage.setItem(PIN_HASH_KEY, fresh.pin_hash);
          if (fresh.id != null) localStorage.setItem(USER_ID_PIN_KEY, String(fresh.id));
        }
        setUser((prev) => {
          if (!prev || prev.id !== fresh.id) return prev;
          const next = { ...prev, ...fresh };
          localStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {});
  }, []); // Solo al montar; sincroniza pin_hash para poder verificar PIN en este dispositivo

  const setToken = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setUser(newUser);
        if (newUser.pin_hash) {
          localStorage.setItem(PIN_HASH_KEY, newUser.pin_hash);
          if (newUser.id != null) localStorage.setItem(USER_ID_PIN_KEY, String(newUser.id));
        }
      }
      setTokenState(newToken);
      const pinOn = newUser?.pin_enabled ?? getPinEnabled();
      const bioOn = newUser?.bio_enabled && hasBiometricCredential(newUser?.id);
      setUnlocked(!(pinOn || bioOn));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUser(null);
      setUnlocked(true);
      // No borrar ENCRYPTED_TOKEN_KEY ni PIN_* para permitir "Entrar con PIN" después
    }
  }, []);

  const login = (newToken, newUser) => setToken(newToken, newUser);
  const logout = () => setToken(null);

  /** Actualiza solo el usuario en estado y localStorage (p. ej. tras editar perfil o PIN/bio). */
  const updateUser = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Activa el bloqueo con PIN: guarda hash y token cifrado en dispositivo y persiste pin_enabled + pin_hash en API. */
  const setPin = useCallback(async (pin, currentUser) => {
    const h = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, h);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    if (currentUser?.id != null) localStorage.setItem(USER_ID_PIN_KEY, String(currentUser.id));
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      const encrypted = await encryptTokenWithPin(currentToken, pin);
      if (encrypted) localStorage.setItem(ENCRYPTED_TOKEN_KEY, encrypted);
    }
    try {
      const updated = await api.auth.updateProfile({ pin_enabled: true, pin_hash: h });
      updateUser(updated);
    } catch {
      // Si falla la API, el estado local ya está bien; el usuario verá pin activo en este dispositivo
    }
    setUnlocked(true);
  }, [updateUser]);

  /** Desactiva el bloqueo con PIN en dispositivo y en API. */
  const clearPin = useCallback(async () => {
    const storedUserId = localStorage.getItem(USER_ID_PIN_KEY);
    try {
      const updated = await api.auth.updateProfile({ pin_enabled: false });
      updateUser(updated);
    } catch {
      // Si falla la API, limpiamos igual en este dispositivo
    }
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    localStorage.removeItem(ENCRYPTED_TOKEN_KEY);
    localStorage.removeItem(USER_ID_PIN_KEY);
    setUnlocked(!hasBiometricCredential(storedUserId));
  }, [updateUser]);

  /** Comprueba si el PIN es correcto; devuelve Promise<boolean>. */
  const checkPin = useCallback(async (pin) => {
    const stored = getStoredPinHash();
    return verifyPin(pin, stored);
  }, []);

  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => setUnlocked(false), []);

  /** Actualiza el token cifrado con el PIN (para que al desconectar se pueda entrar solo con PIN). */
  const refreshEncryptedToken = useCallback(async (pin) => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken || !pin) return;
    const encrypted = await encryptTokenWithPin(currentToken, pin);
    if (encrypted) localStorage.setItem(ENCRYPTED_TOKEN_KEY, encrypted);
  }, []);

  /** Recupera la sesión con PIN: verifica PIN y obtiene token (cifrado o desde login en nuevo dispositivo). */
  const loginWithPin = useCallback(async (pin) => {
    const ok = await checkPin(pin);
    if (!ok) return false;
    let token = null;
    const encrypted = localStorage.getItem(ENCRYPTED_TOKEN_KEY);
    if (encrypted) {
      token = await decryptTokenWithPin(encrypted, pin);
    } else {
      token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const enc = await encryptTokenWithPin(token, pin);
        if (enc) localStorage.setItem(ENCRYPTED_TOKEN_KEY, enc);
      }
    }
    if (!token) return false;
    try {
      const userData = await api.auth.getMe();
      setToken(token, userData);
      await refreshEncryptedToken(pin);
      setUnlocked(true);
      return true;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
  }, [checkPin, setToken, refreshEncryptedToken]);

  /** Indica si se puede entrar con PIN: hay PIN activado y (token cifrado o token + hash para nuevo dispositivo). */
  const canLoginWithPin = !!(
    typeof localStorage !== 'undefined' &&
    (user?.pin_enabled ?? localStorage.getItem(PIN_ENABLED_KEY) === 'true') &&
    (localStorage.getItem(ENCRYPTED_TOKEN_KEY) || (localStorage.getItem(TOKEN_KEY) && (localStorage.getItem(PIN_HASH_KEY) || user?.pin_hash)))
  );

  /** userId asociado al PIN guardado (para saber qué biometría mostrar en login). */
  const getStoredUserIdForPin = useCallback(() => localStorage.getItem(USER_ID_PIN_KEY) || null, []);

  const value = {
    token,
    user,
    login,
    logout,
    setToken,
    updateUser,
    pinEnabled,
    unlocked,
    setPin,
    clearPin,
    checkPin,
    unlock,
    lock,
    loginWithPin,
    canLoginWithPin,
    refreshEncryptedToken,
    getStoredUserIdForPin,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

/** Token actual para enviar en las peticiones API */
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
