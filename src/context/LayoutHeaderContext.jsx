import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LayoutHeaderContext = createContext(null);

export function LayoutHeaderProvider({ children }) {
  const [headerTitle, setHeaderTitle] = useState('');

  const setHeader = useCallback((title) => {
    setHeaderTitle(typeof title === 'string' ? title : '');
  }, []);

  const value = { headerTitle, setHeader };

  return (
    <LayoutHeaderContext.Provider value={value}>
      {children}
    </LayoutHeaderContext.Provider>
  );
}

/** Páginas llaman useLayoutHeader('Título') para mostrar el título en la barra junto al menú. */
export function useLayoutHeader(title) {
  const { setHeader } = useContext(LayoutHeaderContext) || {};
  useEffect(() => {
    if (setHeader) setHeader(title ?? '');
    return () => {
      if (setHeader) setHeader('');
    };
  }, [setHeader, title]);
}

export function useLayoutHeaderContent() {
  const ctx = useContext(LayoutHeaderContext);
  return ctx?.headerTitle ?? '';
}
