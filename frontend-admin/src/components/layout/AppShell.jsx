import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logClick } from '../../api/client';
import styles from './AppShell.module.css';

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dash', icon: '⌂' },
  { to: '/admin/users', label: 'Users', icon: '◎' },
  { to: '/admin/bookings', label: 'Books', icon: '◫' },
  { to: '/admin/market-rates', label: 'Rates', icon: '↑' },
  { to: '/admin/batch-entry', label: 'Batch', icon: '▤' },
  { to: '/admin/tracker-control', label: 'Track', icon: '◉' },
  { to: '/admin/logs', label: 'Logs', icon: '≡' }
];

export default function AppShell({
  title,
  headerRight,
  backPath,
  children,
  hideNav
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const match = location.pathname.match(/^\/admin\/([^/]+)/);
    if (!match) return;
    logClick(`viewed ${match[1]}`, match[1]);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {backPath ? (
          <button type="button" className={styles.back} onClick={() => navigate(backPath)}>
            ← {title}
          </button>
        ) : (
          <h1 className={styles.title}>{title}</h1>
        )}
        {headerRight}
      </header>
      <main className={styles.main}>{children}</main>
      {!hideNav && (
        <nav className={styles.bnav}>
          {ADMIN_NAV.map((item) => (
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
      )}
    </div>
  );
}
