// (marcador cambios - borrar si quieres)
import { createContext, useContext, useState, useCallback } from 'react'; 

const SelectedAccountContext = createContext(null);

export function SelectedAccountProvider({ children }) {
  const [selectedAccountId, setSelectedAccountIdState] = useState(null);

  const setSelectedAccountId = useCallback((value) => {
    setSelectedAccountIdState(value);
  }, []);

  return (
    <SelectedAccountContext.Provider value={{ selectedAccountId, setSelectedAccountId }}>
      {children}
    </SelectedAccountContext.Provider>
  );
}

export function useSelectedAccount() {
  const ctx = useContext(SelectedAccountContext);
  return ctx ?? { selectedAccountId: null, setSelectedAccountId: () => {} };
}
