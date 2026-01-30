import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((data) => {
        setSettings(data || {});
      })
      .catch(() => setSettings({}))
      .finally(() => setLoaded(true));
  }, []);

  const updateSettings = useCallback(async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      const updated = await api.settings.update(patch);
      setSettings(updated || next);
    } catch {
      api.settings.get().then((data) => setSettings(data || {})).catch(() => {});
    }
  }, [settings]);

  const blurBalance = settings.blurBalance === true;
  const setBlurBalance = (value) => updateSettings({ blurBalance: Boolean(value) });

  const primaryAccountId = settings.primaryAccountId != null ? Number(settings.primaryAccountId) : null;
  const setPrimaryAccountId = (id) => updateSettings({ primaryAccountId: id == null ? null : Number(id) });

  return (
    <AppSettingsContext.Provider value={{ blurBalance, setBlurBalance, primaryAccountId, setPrimaryAccountId, settings, updateSettings, loaded }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
