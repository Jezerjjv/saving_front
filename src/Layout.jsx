import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './api';
import {
  IconCalendar,
  IconCreditCard,
  IconFileText,
  IconArrowLeftRight,
  IconSettings,
  IconLogo,
  IconMenu,
  IconChevronDown,
  IconChevronUp,
  IconPercent,
  IconCrypto,
  IconStocks,
  IconLogout,
  IconLock,
} from './components/Icons.jsx';
import { useMovimientosSidebar } from './context/MovimientosSidebarContext';
import { useLayoutHeaderContent } from './context/LayoutHeaderContext';

const inversionesChildren = [
  { to: '/criptomonedas', label: 'Criptomonedas', Icon: IconCrypto },
  { to: '/acciones', label: 'Acciones', Icon: IconStocks },
  { to: '/intereses', label: 'Intereses', Icon: IconPercent },
];

const navBase = [
  { to: '/movimientos', label: 'Movimientos', Icon: IconFileText },
  { to: '/calendario', label: 'Calendario', Icon: IconCalendar },
  { to: '/cuentas', label: 'Cuentas', Icon: IconCreditCard },
  { to: '/transferencias', label: 'Transferencias', Icon: IconArrowLeftRight },
  { type: 'group', label: 'Inversiones', Icon: IconStocks, defaultTo: '/criptomonedas', children: inversionesChildren },
  { to: '/configuracion', label: 'Config', Icon: IconSettings },
];

const MAIN_TABS = [
  { id: 'all', label: 'Todo' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
];
const DEFS_LABEL = 'Rápidos y Fijos';

function isActive(path, location, item) {
  if (path === '/movimientos') return location.pathname === '/movimientos' || location.pathname === '/rapidos-y-fijos';
  if (item?.type === 'group' && item.children) {
    return item.children.some((c) => c.to === location.pathname);
  }
  return location.pathname.startsWith(path);
}

const profileModalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '1rem' },
  box: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
  title: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 },
  field: { marginBottom: '0.75rem' },
  label: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: { width: '100%', padding: '0.5rem 0.65rem', fontSize: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
  btnPrimary: { padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: 'var(--radius)', border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 },
  btnSecondary: { padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' },
  error: { fontSize: '0.85rem', color: 'var(--expense)', marginBottom: '0.5rem' },
};

export default function Layout() {
  const location = useLocation();
  const { user, logout, updateUser, pinEnabled, lock } = useAuth();
  const { actionsRef, sidebarState } = useMovimientosSidebar();
  const actions = actionsRef?.current;
  const headerTitle = useLayoutHeaderContent();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interestEligible, setInterestEligible] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    api.interestHistory.get().then((data) => setInterestEligible(data?.eligible ?? false)).catch(() => setInterestEligible(false));
  }, []);

  const inversionesChildrenFiltered = interestEligible
    ? inversionesChildren
    : inversionesChildren.filter((c) => c.to !== '/intereses');
  const nav = navBase.map((item) =>
    item.type === 'group'
      ? { ...item, children: inversionesChildrenFiltered }
      : item
  );

  const onNavClick = () => setSidebarOpen(false);

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    const newPassword = profilePassword.trim();
    const confirm = profilePasswordConfirm.trim();
    if (newPassword && newPassword.length < 6) {
      setProfileError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword && newPassword !== confirm) {
      setProfileError('Las contraseñas no coinciden');
      return;
    }
    setProfileSaving(true);
    try {
      const body = { name: profileName.trim() };
      if (newPassword) body.password = newPassword;
      const updated = await api.auth.updateProfile(body);
      updateUser(updated);
      closeProfileModal();
    } catch (err) {
      setProfileError(err.message || 'Error al guardar');
    } finally {
      setProfileSaving(false);
    }
  };

  const isMovimientos = location.pathname === '/movimientos';
  const isMovimientosSection = location.pathname === '/movimientos' || location.pathname === '/rapidos-y-fijos';
  const activeTab = sidebarState?.activeTab ?? 'all';

  return (
    <div className="layout-wrapper">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
        role="button"
        tabIndex={-1}
        aria-hidden="true"
      />

      <aside className={`layout-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div className="sidebar-header-left">
              {user && (
                <div className="sidebar-user-block">
                  <span className="sidebar-user-name" title={user.email}>
                    {user.name?.trim() || user.email}
                  </span>
                  <button
                    type="button"
                    className="sidebar-btn-profile"
                    onClick={() => { setProfileName(user.name || ''); setProfilePassword(''); setProfilePasswordConfirm(''); setProfileError(''); setProfileModalOpen(true); }}
                    title="Editar perfil (nombre y contraseña)"
                    aria-label="Editar perfil"
                  >
                    <IconSettings size={18} />
                  </button>
                  {pinEnabled && (
                    <button
                      type="button"
                      className="sidebar-btn-disconnect"
                      onClick={() => { lock(); onNavClick(); }}
                      title="Bloquear la app"
                      aria-label="Bloquear"
                    >
                      <IconLock size={18} />
                      <span>Bloquear</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="sidebar-btn-disconnect"
                    onClick={() => { logout(); onNavClick(); }}
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                  >
                    <IconLogout size={18} />
                    <span>Desconectar</span>
                  </button>
                </div>
              )}
              <Link to="/movimientos" className="sidebar-logo" onClick={onNavClick} aria-label="Saving">
                <IconLogo size={32} style={{ color: 'var(--accent)' }} />
                <span className="sidebar-logo-text">Saving</span>
              </Link>
            </div>
            <button
              type="button"
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>

          <nav className="sidebar-nav" aria-label="Navegación principal">
            {nav.map((item) => {
              const to = item.to ?? item.defaultTo;
              const label = item.label;
              const Icon = item.Icon;
              const active = isActive(to, location, item);
              return (
              <div key={to ?? 'inversiones'} className="sidebar-nav-item">
                <Link
                  to={to}
                  className={`sidebar-link ${active ? 'is-active' : ''}`}
                  onClick={onNavClick}
                  aria-current={active && !item.children ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
                {to === '/movimientos' && isMovimientosSection && (
                  <div className="sidebar-subnav">
                    {actions && (
                      <>
                        <div className="sidebar-btn-row">
                          <button
                            type="button"
                            className="sidebar-btn sidebar-btn-expense"
                            onClick={() => { actions.openAdd('expense', 'normal'); onNavClick(); }}
                            title="Añadir gasto"
                          >
                            <span className="sidebar-btn-symbol">+</span>
                            Gasto
                          </button>
                          <button
                            type="button"
                            className="sidebar-btn sidebar-btn-income"
                            onClick={() => { actions.openAdd('income', 'normal'); onNavClick(); }}
                            title="Añadir ingreso"
                          >
                            <span className="sidebar-btn-symbol">+</span>
                            Ingreso
                          </button>
                        </div>
                        {MAIN_TABS.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            className={`sidebar-link-btn ${activeTab === tab.id ? 'is-active' : ''}`}
                            onClick={() => { actions.setActiveTab(tab.id); onNavClick(); }}
                          >
                            {tab.id === 'all' && (
                              <>
                                <IconChevronDown size={16} className="sidebar-icon-expense" />
                                <IconChevronUp size={16} className="sidebar-icon-income" />
                              </>
                            )}
                            {tab.id === 'expense' && <IconChevronDown size={16} className="sidebar-icon-expense" />}
                            {tab.id === 'income' && <IconChevronUp size={16} className="sidebar-icon-income" />}
                            <span>{tab.label}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {!actions && MAIN_TABS.map((tab) => (
                      <Link
                        key={tab.id}
                        to="/movimientos"
                        className={`sidebar-link-btn ${location.pathname === '/movimientos' ? 'is-active' : ''}`}
                        onClick={onNavClick}
                      >
                        {tab.id === 'all' && (
                          <>
                            <IconChevronDown size={16} className="sidebar-icon-expense" />
                            <IconChevronUp size={16} className="sidebar-icon-income" />
                          </>
                        )}
                        {tab.id === 'expense' && <IconChevronDown size={16} className="sidebar-icon-expense" />}
                        {tab.id === 'income' && <IconChevronUp size={16} className="sidebar-icon-income" />}
                        <span>{tab.label}</span>
                      </Link>
                    ))}
                    <Link
                      to="/rapidos-y-fijos"
                      className={`sidebar-link-btn ${location.pathname === '/rapidos-y-fijos' ? 'is-active' : ''}`}
                      onClick={onNavClick}
                      aria-current={location.pathname === '/rapidos-y-fijos' ? 'page' : undefined}
                    >
                      <IconFileText size={16} />
                      <span>{DEFS_LABEL}</span>
                    </Link>
                  </div>
                )}
                {item.type === 'group' && item.children && active && (
                  <div className="sidebar-subnav">
                    {item.children.map((child) => {
                      const ChildIcon = child.Icon;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`sidebar-link-btn ${location.pathname === child.to ? 'is-active' : ''}`}
                          onClick={onNavClick}
                          aria-current={location.pathname === child.to ? 'page' : undefined}
                        >
                          <ChildIcon size={16} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
            })}
          </nav>
        </div>
      </aside>

      <main className="layout-main" role="main">
        <header className="layout-header">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <IconMenu size={24} />
          </button>
          {headerTitle ? <h1 className="layout-header-title">{headerTitle}</h1> : null}
        </header>
        <div className="layout-content">
          <Outlet />
        </div>
        <footer className="layout-footer">
          © <span className="layout-footer-year">{new Date().getFullYear()}</span> jezer-saving
        </footer>
      </main>

      {profileModalOpen && (
        <div style={profileModalStyles.overlay} onClick={closeProfileModal} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <div style={profileModalStyles.box} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="profile-modal-title" style={profileModalStyles.title}>Editar perfil</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>Cambiar nombre o contraseña. El correo no se puede modificar.</p>
            <form onSubmit={handleProfileSubmit}>
              {profileError && <div style={profileModalStyles.error}>{profileError}</div>}
              <div style={profileModalStyles.field}>
                <label style={profileModalStyles.label} htmlFor="profile-email">Correo</label>
                <input
                  id="profile-email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  style={{ ...profileModalStyles.input, opacity: 0.8, cursor: 'not-allowed' }}
                />
              </div>
              <div style={profileModalStyles.field}>
                <label style={profileModalStyles.label} htmlFor="profile-name">Nombre</label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Tu nombre"
                  style={profileModalStyles.input}
                  autoComplete="name"
                />
              </div>
              <div style={profileModalStyles.field}>
                <label style={profileModalStyles.label} htmlFor="profile-password">Nueva contraseña (opcional)</label>
                <input
                  id="profile-password"
                  type="password"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Dejar en blanco para no cambiar"
                  style={profileModalStyles.input}
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <div style={profileModalStyles.field}>
                <label style={profileModalStyles.label} htmlFor="profile-password-confirm">Confirmar contraseña</label>
                <input
                  id="profile-password-confirm"
                  type="password"
                  value={profilePasswordConfirm}
                  onChange={(e) => setProfilePasswordConfirm(e.target.value)}
                  placeholder="Solo si cambias la contraseña"
                  style={profileModalStyles.input}
                  autoComplete="new-password"
                />
              </div>
              <div style={profileModalStyles.actions}>
                <button type="button" onClick={closeProfileModal} style={profileModalStyles.btnSecondary}>Cancelar</button>
                <button type="submit" disabled={profileSaving} style={profileModalStyles.btnPrimary}>
                  {profileSaving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
