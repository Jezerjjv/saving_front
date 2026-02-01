import { createContext, useContext, useState, useCallback } from 'react';
import { hashPin, verifyPin, encryptTokenWithPin, decryptTokenWithPin } from '../utils/pin';
import { hasBiometricCredential } from '../utils/webauthn';
import { api } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'saving_token';
const USER_KEY = 'saving_user';
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
  // Bloqueado si hay token y (PIN activado O biometría registrada) hasta que el usuario desbloquee
  const [unlocked, setUnlocked] = useState(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) return true;
    return !(getPinEnabled() || hasBiometricCredential());
  });
  const [pinEnabled, setPinEnabledState] = useState(getPinEnabled);

  const setToken = useCallback((newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      if (newUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setUser(newUser);
      }
      setTokenState(newToken);
      setPinEnabledState(getPinEnabled());
      setUnlocked(!(getPinEnabled() || hasBiometricCredential()));
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

  /** Actualiza solo el usuario en estado y localStorage (p. ej. tras editar perfil). */
  const updateUser = (partial) => {
    if (!user) return;
    const next = { ...user, ...partial };
    setUser(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  };

  /** Activa el bloqueo con PIN guardando el hash del PIN y el token cifrado (para login con PIN). */
  const setPin = useCallback(async (pin) => {
    const h = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, h);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    setPinEnabledState(true);
    setUnlocked(true);
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      const encrypted = await encryptTokenWithPin(currentToken, pin);
      if (encrypted) localStorage.setItem(ENCRYPTED_TOKEN_KEY, encrypted);
    }
  }, []);

  /** Desactiva el bloqueo con PIN. Si solo queda biometría, la app sigue bloqueada hasta biometría. */
  const clearPin = useCallback(() => {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    localStorage.removeItem(ENCRYPTED_TOKEN_KEY);
    setPinEnabledState(false);
    setUnlocked(!hasBiometricCredential());
  }, []);

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

  /** Recupera la sesión desde el token cifrado con PIN (p. ej. desde la página de login). */
  const loginWithPin = useCallback(async (pin) => {
    const ok = await checkPin(pin);
    if (!ok) return false;
    const encrypted = localStorage.getItem(ENCRYPTED_TOKEN_KEY);
    if (!encrypted) return false;
    const token = await decryptTokenWithPin(encrypted, pin);
    if (!token) return false;
    localStorage.setItem(TOKEN_KEY, token);
    try {
      const userData = await api.auth.getMe();
      setToken(token, userData);
      await refreshEncryptedToken(pin);
      setUnlocked(true); // Ya entró con PIN, no pedir de nuevo en la pantalla de bloqueo
      return true;
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      return false;
    }
  }, [checkPin, setToken, refreshEncryptedToken]);

  /** Indica si se puede entrar con PIN (hay PIN activado y token cifrado guardado). */
  const canLoginWithPin = !!(
    typeof localStorage !== 'undefined' &&
    localStorage.getItem(PIN_ENABLED_KEY) === 'true' &&
    localStorage.getItem(ENCRYPTED_TOKEN_KEY)
  );

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
