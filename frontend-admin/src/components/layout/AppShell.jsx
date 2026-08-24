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
  { to: '/admin/logs', label: 'Logs', icon: '≡' },
  { to: '/admin/driver/dashboard', label: 'Driver', icon: '🚛' }
];

const DRIVER_NAV = [
  { to: '/admin/driver/dashboard', label: 'Dash', icon: '⌂' },
  { to: '/admin/driver/vehicles', label: 'Vehicles', icon: '◎' },
  { to: '/admin/driver/entries', label: 'Entries', icon: '◫' },
  { to: '/admin/driver/parties', label: 'Parties', icon: '▤' },
  { to: '/admin/driver/reports', label: 'Reports', icon: '≡' }
];

export default function AppShell({
  title,
  headerRight,
  backPath,
  children,
  hideNav,
  driverSection
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isDriverMode =
    driverSection || location.pathname.startsWith('/admin/driver');
  const navItems = isDriverMode ? DRIVER_NAV : ADMIN_NAV;

  useEffect(() => {
    const match = location.pathname.match(/^\/admin\/([^/]+)/);
    if (!match) return;
    logClick(`viewed ${match[1]}`, match[1]);
  }, [location.pathname]);

  return (
    <div className={`${styles.shell} ${isDriverMode ? styles.shellDriver : ''}`}>
      <header className={`${styles.header} ${isDriverMode ? styles.headerDriver : ''}`}>
        {backPath ? (
          <button type="button" className={styles.back} onClick={() => navigate(backPath)}>
            ← {title}
          </button>
        ) : (
          <h1 className={styles.title}>{title}</h1>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isDriverMode && (
            <button
              type="button"
              className={styles.tracknowLink}
              onClick={() => navigate('/admin/dashboard')}
            >
              TrackNow
            </button>
          )}
          {headerRight}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      {!hideNav && (
        <nav className={styles.bnav}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin/driver/dashboard' || item.to === '/admin/dashboard'}
              className={({ isActive }) =>
                `${styles.bnavItem} ${isActive ? styles.active : ''} ${isDriverMode ? styles.bnavDriver : ''}`
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
