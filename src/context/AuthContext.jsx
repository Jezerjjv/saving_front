import { createContext, useContext, useState, useCallback } from 'react';
import { hashPin, verifyPin } from '../utils/pin';

const AuthContext = createContext(null);

const TOKEN_KEY = 'saving_token';
const USER_KEY = 'saving_user';
const PIN_ENABLED_KEY = 'saving_pin_enabled';
const PIN_HASH_KEY = 'saving_pin_hash';

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
  // Si hay PIN activado, la app empieza bloqueada hasta que el usuario introduzca el PIN
  const [unlocked, setUnlocked] = useState(() => {
    if (!getPinEnabled()) return true;
    return false;
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
      // Tras login: si PIN activado, quedamos bloqueados; si no, desbloqueados
      setUnlocked(!getPinEnabled());
      setPinEnabledState(getPinEnabled());
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setTokenState(null);
      setUser(null);
      setUnlocked(true);
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

  /** Activa el bloqueo con PIN guardando el hash del PIN. */
  const setPin = useCallback(async (pin) => {
    const h = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, h);
    localStorage.setItem(PIN_ENABLED_KEY, 'true');
    setPinEnabledState(true);
    setUnlocked(true); // Ya estamos "dentro", no bloquear ahora
  }, []);

  /** Desactiva el bloqueo con PIN. */
  const clearPin = useCallback(() => {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_ENABLED_KEY);
    setPinEnabledState(false);
    setUnlocked(true);
  }, []);

  /** Comprueba si el PIN es correcto; devuelve Promise<boolean>. */
  const checkPin = useCallback(async (pin) => {
    const stored = getStoredPinHash();
    return verifyPin(pin, stored);
  }, []);

  const unlock = useCallback(() => setUnlocked(true), []);
  const lock = useCallback(() => setUnlocked(false), []);

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
