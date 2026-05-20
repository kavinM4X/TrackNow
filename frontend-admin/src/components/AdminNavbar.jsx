import { Link } from 'react-router-dom';

function AdminNavbar({ user, onLogout }) {
  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">TrackNow Admin</div>
      <div className="admin-navbar-links">
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>Welcome, {user?.name}</span>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontWeight: '500' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default AdminNavbar;
