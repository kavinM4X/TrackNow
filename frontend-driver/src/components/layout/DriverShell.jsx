import { NavLink, useNavigate } from 'react-router-dom';
import styles from './DriverShell.module.css';

const NAV = [
  { to: '/dashboard', label: 'Dash', icon: '⌂' },
  { to: '/expense', label: 'Expense', icon: '◎' },
  { to: '/silk', label: 'Silk', icon: '◫' },
  { to: '/parties', label: 'Parties', icon: '▤' },
  { to: '/profile', label: 'Profile', icon: '≡' }
];

export default function DriverShell({ title, backPath, headerRight, hideNav, children }) {
  const navigate = useNavigate();

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
