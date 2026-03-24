import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconLogo, IconLock, IconFingerprint } from '../components/Icons.jsx';
import { isWebAuthnAvailable, hasBiometricCredential, authenticateBiometric } from '../utils/webauthn';

export default function LockScreen() {
  const { user, pinEnabled, checkPin, unlock, logout, refreshEncryptedToken } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const bioAvailable = isWebAuthnAvailable();
  const bioRegistered = hasBiometricCredential(user?.id);
  const onlyBiometric = !pinEnabled && bioRegistered;

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError('');
    if (!pin.trim()) {
      setError('Introduce tu PIN');
      return;
    }
    setLoading(true);
    try {
      const ok = await checkPin(pin.trim());
      if (ok) {
        await refreshEncryptedToken(pin.trim());
        unlock();
        setPin('');
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch {
      setError('Error al comprobar el PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError('');
    if (!bioRegistered) {
      setError('Primero registra la biometría en Configuración');
      return;
    }
    setLoading(true);
    try {
      const ok = await authenticateBiometric(user?.id);
      if (ok) unlock();
      else setError('No se pudo verificar la biometría');
    } catch {
      setError('Error al usar biometría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lock-page">
      <div className="lock-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <IconLogo size={96} />
        </div>
        <h1 className="lock-title">Desbloquear</h1>
        <p className="lock-subtitle">
          {user?.name || user?.email ? `Hola, ${user.name || user.email}` : onlyBiometric ? 'Usa biometría para continuar' : 'Introduce tu PIN para continuar'}
        </p>
        {onlyBiometric ? (
          <>
            {error && (
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--danger, #e74c3c)', textAlign: 'center' }}>
                {error}
              </p>
            )}
            <div className="lock-btn-row">
              <button
                type="button"
                className="lock-btn-unlock"
                onClick={handleBiometric}
                disabled={loading}
              >
                {loading ? 'Comprobando…' : 'Usar biometría'}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="lock-pin-input"
              placeholder="PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--danger, #e74c3c)', textAlign: 'center' }}>
                {error}
              </p>
            )}
            <div className="lock-btn-row">
              <button type="submit" className="lock-btn-unlock" disabled={loading}>
                {loading ? 'Comprobando…' : 'Desbloquear'}
              </button>
              {bioRegistered && (
                <button
                  type="button"
                  className="lock-btn-bio"
                  onClick={handleBiometric}
                  disabled={!bioAvailable || loading}
                  title="Usar biometría"
                >
                  <IconFingerprint size={20} />
                  Biometría
                </button>
              )}
            </div>
          </form>
        )}
        <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link
            to="/login"
            onClick={logout}
            style={{ fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            title="Cerrar sesión solo en este dispositivo. Tendrás que usar email y contraseña para volver a entrar aquí."
          >
            <IconLock size={16} />
            Cerrar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
