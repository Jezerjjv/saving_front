import { Link, useLocation } from 'react-router-dom';
import {
  IconCalendar,
  IconCreditCard,
  IconFileText,
  IconArrowLeftRight,
  IconSettings,
  IconLogo,
} from './components/Icons.jsx';

const nav = [
  { to: '/movimientos', label: 'Movimientos', Icon: IconFileText },
  { to: '/calendario', label: 'Calendario', Icon: IconCalendar },
  { to: '/cuentas', label: 'Cuentas', Icon: IconCreditCard },
  { to: '/transferencias', label: 'Transferencias', Icon: IconArrowLeftRight },
  { to: '/configuracion', label: 'Config', Icon: IconSettings },
];

function isActive(path, location) {
  if (path === '/movimientos') return location.pathname === '/movimientos';
  return location.pathname.startsWith(path);
}

export default function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="layout-wrapper" style={styles.wrapper}>
      <header className="layout-header" style={styles.header}>
        <Link to="/" style={styles.logo} aria-label="Mi Finanzas">
          <IconLogo size={36} style={{ color: 'var(--accent)' }} />
        </Link>
        <nav className="nav-top" style={styles.nav}>
          {nav.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              style={{
                ...styles.navLink,
                ...(isActive(to, location) ? styles.navLinkActive : {}),
              }}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="layout-main" style={styles.main} role="main">{children}</main>
      <nav className="nav-bottom" aria-label="Navegación principal">
        {nav.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`nav-bottom-link ${isActive(to, location) ? 'active' : ''}`}
            aria-label={label}
            aria-current={isActive(to, location) ? 'page' : undefined}
          >
            <span className="nav-bottom-icon" aria-hidden="true"><Icon size={24} /></span>
            <span className="nav-bottom-label">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    textDecoration: 'none',
    background: 'transparent',
  },
  nav: {
    display: 'flex',
    gap: '0.25rem',
    flexWrap: 'wrap',
  },
  navLink: {
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
  },
  navLinkActive: {
    background: 'var(--surface-hover)',
    color: 'var(--accent)',
  },
  main: {
    flex: 1,
    padding: '1rem',
    maxWidth: 900,
    margin: '0 auto',
    width: '100%',
  },
};
