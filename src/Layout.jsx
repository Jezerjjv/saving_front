import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from './components/Icons.jsx';
import { useMovimientosSidebar } from './context/MovimientosSidebarContext';
import { useLayoutHeaderContent } from './context/LayoutHeaderContext';

const navBase = [
  { to: '/movimientos', label: 'Movimientos', Icon: IconFileText },
  { to: '/calendario', label: 'Calendario', Icon: IconCalendar },
  { to: '/cuentas', label: 'Cuentas', Icon: IconCreditCard },
  { to: '/transferencias', label: 'Transferencias', Icon: IconArrowLeftRight },
  { to: '/criptomonedas', label: 'Criptomonedas', Icon: IconCrypto },
  { to: '/acciones', label: 'Acciones', Icon: IconStocks },
  { to: '/configuracion', label: 'Config', Icon: IconSettings },
];

const MAIN_TABS = [
  { id: 'all', label: 'Todo' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
];
const DEFS_LABEL = 'Rápidos y Fijos';

function isActive(path, location) {
  if (path === '/movimientos') return location.pathname === '/movimientos' || location.pathname === '/rapidos-y-fijos';
  if (path === '/intereses') return location.pathname === '/intereses';
  if (path === '/criptomonedas') return location.pathname === '/criptomonedas';
  if (path === '/acciones') return location.pathname === '/acciones';
  return location.pathname.startsWith(path);
}

export default function Layout({ children }) {
  const location = useLocation();
  const { actionsRef, sidebarState } = useMovimientosSidebar();
  const actions = actionsRef?.current;
  const headerTitle = useLayoutHeaderContent();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [interestEligible, setInterestEligible] = useState(false);

  useEffect(() => {
    api.interestHistory.get().then((data) => setInterestEligible(data?.eligible ?? false)).catch(() => setInterestEligible(false));
  }, []);

  const nav = interestEligible ? [...navBase, { to: '/intereses', label: 'Intereses', Icon: IconPercent }] : navBase;

  const onNavClick = () => setSidebarOpen(false);

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
            <Link to="/" className="sidebar-logo" onClick={onNavClick} aria-label="Mis Finanzas">
            <IconLogo size={32} style={{ color: 'var(--accent)' }} />
              <span className="sidebar-logo-text">Mis Finanzas</span>
            </Link>
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
            {nav.map(({ to, label, Icon }) => (
              <div key={to} className="sidebar-nav-item">
                <Link
                  to={to}
                  className={`sidebar-link ${isActive(to, location) ? 'is-active' : ''}`}
                  onClick={onNavClick}
                  aria-current={isActive(to, location) ? 'page' : undefined}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
                {to === '/movimientos' && isMovimientosSection && (
                  <div className="sidebar-subnav">
                    {actions && (
                      <>
                        <button
                          type="button"
                          className="sidebar-btn sidebar-btn-expense"
                          onClick={() => { actions.openAdd('expense', 'normal'); onNavClick(); }}
                        >
                          <span className="sidebar-btn-symbol">+</span>
                          Añadir gasto
                        </button>
                        <button
                          type="button"
                          className="sidebar-btn sidebar-btn-income"
                          onClick={() => { actions.openAdd('income', 'normal'); onNavClick(); }}
                        >
                          <span className="sidebar-btn-symbol">+</span>
                          Añadir ingreso
                        </button>
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
              </div>
            ))}
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
          {children}
        </div>
        <footer className="layout-footer">
          © <span className="layout-footer-year">{new Date().getFullYear()}</span> jezer-saving
        </footer>
      </main>
    </div>
  );
}
