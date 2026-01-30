import { useEffect } from 'react';

const typeStyles = {
  success: { bg: 'var(--income)', color: '#fff' },
  error: { bg: 'var(--expense)', color: '#fff' },
  info: { bg: 'var(--accent)', color: '#fff' },
};

export default function MessagePopup({ notification, onCloseNotification, confirmState, onConfirm }) {
  const isConfirm = !!confirmState;
  const isNotification = !!notification;

  useEffect(() => {
    if (!isNotification) return;
    const t = setTimeout(onCloseNotification, 3500);
    return () => clearTimeout(t);
  }, [isNotification, notification, onCloseNotification]);

  if (!isConfirm && !isNotification) return null;

  if (isConfirm) {
    return (
      <div style={styles.overlay} onClick={() => onConfirm(false)}>
        <div style={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.confirmTitle}>{confirmState.title}</h3>
          <p style={styles.confirmMessage}>{confirmState.message}</p>
          <div style={styles.confirmActions}>
            <button type="button" onClick={() => onConfirm(false)} style={styles.btnCancel}>
              Cancelar
            </button>
            <button type="button" onClick={() => onConfirm(true)} style={styles.btnOk}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const style = typeStyles[notification.type] || typeStyles.info;
  return (
    <div style={styles.overlay} onClick={onCloseNotification}>
      <div
        style={{
          ...styles.notificationBox,
          background: style.bg,
          color: style.color,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={styles.notificationMessage}>{notification.message}</p>
        <button type="button" onClick={onCloseNotification} style={styles.notificationClose}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  confirmBox: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    maxWidth: 360,
    width: '100%',
  },
  confirmTitle: { margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 600 },
  confirmMessage: { margin: '0 0 1rem', color: 'var(--text)', lineHeight: 1.5 },
  confirmActions: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' },
  btnCancel: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
  },
  btnOk: {
    padding: '0.5rem 1rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  notificationBox: {
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius)',
    maxWidth: 360,
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  notificationMessage: { margin: '0 0 0.75rem', fontSize: '1rem' },
  notificationClose: {
    background: 'rgba(255,255,255,0.25)',
    color: 'inherit',
    border: 'none',
    padding: '0.35rem 0.75rem',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
};
