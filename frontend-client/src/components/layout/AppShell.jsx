import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { logClick } from '../../api/client';
import styles from './AppShell.module.css';

function NavIcon({ name }) {
  const props = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };
  if (name === 'home') {
    return (
      <svg {...props}>
        <path d="M12 3 2 12h3v8h5v-6h4v6h5v-8h3L12 3z" />
      </svg>
    );
  }
  const glyphs = { book: '◫', hist: '▤', track: '◎', set: '⚙' };
  return <span className={styles.bnavGlyph}>{glyphs[name]}</span>;
}

const CLIENT_NAV = [
  { to: '/dashboard', label: 'Home', icon: 'home', end: true },
  { to: '/booking', label: 'Book', icon: 'book' },
  { to: '/batch-history', label: 'Hist', icon: 'hist' },
  { to: '/tracker', label: 'Track', icon: 'track' },
  { to: '/settings', label: 'Set', icon: 'set', end: true }
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
            end={item.end}
            className={({ isActive }) =>
              `${styles.bnavItem} ${isActive ? styles.active : styles.inactive}`
            }
          >
            <span className={styles.bnavIcon}>
              <NavIcon name={item.icon} />
            </span>
            <span className={styles.bnavLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
