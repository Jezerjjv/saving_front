import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api';
import { mergeMenuVisibility } from '../config/sidebarNav';

const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ children }) {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [interestEligible, setInterestEligible] = useState(false);

  useEffect(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('saving_token') : null;
    if (!token) {
      setSettings({});
      setLoaded(true);
      return;
    }
    Promise.all([
      api.settings.get(),
      api.interestHistory.get().catch(() => ({ eligible: false })),
    ])
      .then(([data, interest]) => {
        setSettings(data || {});
        setInterestEligible(interest?.eligible ?? false);
      })
      .catch(() => {
        setSettings({});
        setInterestEligible(false);
      })
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

  const appCurrency = settings.appCurrency === 'USD' ? 'USD' : 'EUR';
  const setAppCurrency = (value) => updateSettings({ appCurrency: value === 'USD' ? 'USD' : 'EUR' });

  const exchangeRateUsdToEur = settings.exchangeRateUsdToEur != null ? Number(settings.exchangeRateUsdToEur) : 0.92;
  const setExchangeRateUsdToEur = (value) => updateSettings({ exchangeRateUsdToEur: value == null || value === '' ? 0.92 : Number(value) });

  const menuVisibility = useMemo(() => mergeMenuVisibility(settings.menuVisibility), [settings.menuVisibility]);

  const setMenuItemVisible = (key, visible) => {
    const next = { ...menuVisibility, [key]: Boolean(visible) };
    return updateSettings({ menuVisibility: next });
  };

  const isMenuItemVisible = useCallback(
    (key) => menuVisibility[key] !== false,
    [menuVisibility]
  );

  return (
    <AppSettingsContext.Provider
      value={{
        blurBalance,
        setBlurBalance,
        primaryAccountId,
        setPrimaryAccountId,
        appCurrency,
        setAppCurrency,
        exchangeRateUsdToEur,
        setExchangeRateUsdToEur,
        menuVisibility,
        setMenuItemVisible,
        isMenuItemVisible,
        interestEligible,
        settings,
        updateSettings,
        loaded,
        settingsLoaded: loaded,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
