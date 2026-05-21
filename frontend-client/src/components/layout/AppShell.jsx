import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logClick } from '../../api/client';
import styles from './AppShell.module.css';

const CLIENT_NAV = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/booking', label: 'Book', icon: '◫' },
  { to: '/batch-history', label: 'Hist', icon: '▤' },
  { to: '/tracker', label: 'Track', icon: '◎' },
  { to: '/settings', label: 'Set', icon: '⚙' }
];

export default function AppShell({
  title,
  subtitle,
  headerRight,
  backPath,
  children,
  activePulse
}) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const page = location.pathname.replace(/^\//, '') || 'dashboard';
    logClick(`viewed ${page}`, page);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
          <h1 className={styles.title}>{title}</h1>
        </div>
        <div className={styles.headerRight}>
          {activePulse && <span className="pulse-dot" title="Live" />}
          {headerRight}
          {backPath && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => navigate(backPath)}
              aria-label="Go back"
            >
              ← Back
            </button>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <nav className={styles.bnav}>
        {CLIENT_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `${styles.bnavItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.bnavIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
