import { createContext, useContext, useRef, useState, useCallback, useMemo } from 'react';

const MovimientosSidebarContext = createContext(null);

export function MovimientosSidebarProvider({ children }) {
  const actionsRef = useRef(null);
  const [sidebarState, setSidebarState] = useState({ activeTab: 'all' });

  const register = useCallback((actions) => {
    actionsRef.current = actions;
  }, []);

  const unregister = useCallback(() => {
    actionsRef.current = null;
  }, []);

  const updateState = useCallback((state) => {
    setSidebarState((prev) => ({ ...prev, ...state }));
  }, []);

  const value = useMemo(
    () => ({
      actionsRef,
      sidebarState,
      register,
      unregister,
      updateState,
      get actions() {
        return actionsRef.current;
      },
    }),
    [sidebarState, register, unregister, updateState]
  );

  return (
    <MovimientosSidebarContext.Provider value={value}>
      {children}
    </MovimientosSidebarContext.Provider>
  );
}

export function useMovimientosSidebar() {
  return useContext(MovimientosSidebarContext);
}
