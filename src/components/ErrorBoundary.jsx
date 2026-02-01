import { Component } from 'react';

/** Si la app lanza un error, muestra un mensaje en lugar de pantalla en blanco (útil en móvil). */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            background: 'var(--bg, #0f0f12)',
            color: 'var(--text, #e8e8ed)',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Algo ha fallado</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted, #8b8b96)', marginBottom: '1rem' }}>
            Recarga la página. Si sigue igual, prueba en otro navegador o borra la caché.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.2rem',
              fontSize: '1rem',
              background: 'var(--accent, #6366f1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
