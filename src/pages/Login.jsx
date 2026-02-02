import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconLogo, IconLock, IconFingerprint } from '../components/Icons.jsx';
import { isWebAuthnAvailable, hasBiometricCredential, authenticateBiometric } from '../utils/webauthn';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const { login, loginWithPin, canLoginWithPin, getStoredUserIdForPin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingBioUnlock, setPendingBioUnlock] = useState(false);
  const bioAvailable = isWebAuthnAvailable() && hasBiometricCredential(getStoredUserIdForPin?.() ?? null);
  // Solo con PIN se puede "entrar sin email/contraseña" (token cifrado). Con solo bio, Desconectar = bloquear, no login.
  const [useEmailForm, setUseEmailForm] = useState(() => !canLoginWithPin);
  const showPinOrBio = !useEmailForm && canLoginWithPin;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(BASE + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }
      login(data.token, data.user);
      navigate('/movimientos', { replace: true });
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handlePinUnlock(e) {
    e.preventDefault();
    setError('');
    if (!pin.trim()) {
      setError('Introduce tu PIN');
      return;
    }
    setLoading(true);
    try {
      const ok = await loginWithPin(pin.trim());
      if (ok) navigate('/movimientos', { replace: true });
      else setError('PIN incorrecto o sesión no disponible');
      setPin('');
    } catch {
      setError('Error al recuperar la sesión');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    setError('');
    setLoading(true);
    try {
      const ok = await authenticateBiometric(getStoredUserIdForPin?.() ?? null);
      if (ok) {
        setPendingBioUnlock(true);
        setUseEmailForm(false);
        setError('');
      } else setError('No se pudo verificar la biometría');
    } catch {
      setError('Error al usar biometría');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <IconLogo size={48} />
        </div>
        <p className="auth-subtitle">
          {showPinOrBio
            ? pendingBioUnlock
              ? 'Introduce tu PIN para recuperar la sesión'
              : 'Desbloquea con PIN'
            : 'Inicia sesión en tu cuenta'}
        </p>

        {showPinOrBio ? (
          <form className="auth-form" onSubmit={handlePinUnlock}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              className="auth-input lock-pin-input"
              placeholder="PIN"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
              }
              maxLength={8}
              disabled={loading}
              autoFocus
            />
            <div className="auth-pin-bio-row">
              <button
                type="submit"
                className="auth-btn"
                disabled={loading}
              >
                {loading ? 'Comprobando…' : 'Desbloquear'}
              </button>
              {bioAvailable && (
                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={handleBiometric}
                  disabled={loading}
                >
                  <IconFingerprint size={18} />
                  Biometría
                </button>
              )}
            </div>
            <p className="auth-footer-inline">
              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setUseEmailForm(true);
                  setPendingBioUnlock(false);
                  setPin('');
                  setError('');
                }}
              >
                Entrar con email y contraseña
              </button>
            </p>
          </form>
        ) : (
          <>
            <form className="auth-form" onSubmit={handleSubmit}>
              {error && (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              )}
              <div className="auth-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  className="auth-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="login-password">Contraseña</label>
                <input
                  id="login-password"
                  type="password"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? 'Entrando…' : 'Entrar'}
              </button>
            </form>
            {canLoginWithPin && (
              <p className="auth-footer-inline">
                <button
                  type="button"
                  className="auth-link-button"
                  onClick={() => {
                    setUseEmailForm(false);
                    setError('');
                  }}
                >
                  Entrar con PIN
                </button>
              </p>
            )}
          </>
        )}

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
