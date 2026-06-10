import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import styles from './DriverShell.module.css';

const NAV = [
  { to: '/dashboard', label: 'Dash', icon: '⌂' },
  { to: '/expense', label: 'Expense', icon: '◎' },
  { to: '/silk', label: 'Silk', icon: '◫' },
  { to: '/parties', label: 'Parties', icon: '▤' },
  { to: '/history', label: 'History', icon: '◷' },
  { to: '/profile', label: 'Profile', icon: '≡' }
];

export default function DriverShell({ title, backPath, headerRight, hideNav, children }) {
  const navigate = useNavigate();
  const location = useLocation();

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
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => {
                const active =
                  item.to === '/expense'
                    ? location.pathname.startsWith('/expense')
                    : item.to === '/history'
                      ? location.pathname.startsWith('/history')
                      : isActive;
                return `${styles.bnavItem} ${active ? styles.active : ''}`;
              }}
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
