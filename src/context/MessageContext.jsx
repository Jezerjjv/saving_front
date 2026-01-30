import { createContext, useContext, useState, useCallback } from 'react';
import MessagePopup from '../components/MessagePopup';

const MessageContext = createContext(null);

export function MessageProvider({ children }) {
  const [notification, setNotification] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const showMessage = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setConfirmState(null);
  }, []);

  const confirm = useCallback(({ title = 'Confirmar', message, onConfirm, onCancel }) => {
    setConfirmState({ title, message, onConfirm, onCancel });
    setNotification(null);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const closeConfirm = useCallback((confirmed) => {
    if (confirmState) {
      if (confirmed && confirmState.onConfirm) confirmState.onConfirm();
      if (!confirmed && confirmState.onCancel) confirmState.onCancel();
      setConfirmState(null);
    }
  }, [confirmState]);

  return (
    <MessageContext.Provider value={{ showMessage, confirm }}>
      {children}
      <MessagePopup
        notification={notification}
        onCloseNotification={closeNotification}
        confirmState={confirmState}
        onConfirm={(v) => { closeConfirm(v); }}
      />
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error('useMessage must be used within MessageProvider');
  return ctx;
}
