import { Link, useLocation } from 'react-router-dom';

function AdminSidebar() {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/users', label: 'Users', icon: '👥' },
    { path: '/bookings', label: 'Bookings', icon: '📦' },
    { path: '/batches', label: 'Batches', icon: '🌿' },
    { path: '/market-rates', label: 'Market Rates', icon: '💰' },
    { path: '/trackers', label: 'Trackers', icon: '📍' },
    { path: '/logs', label: 'Logs', icon: '📝' },
  ];

  return (
    <aside className="admin-sidebar">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`admin-sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
        >
          <span style={{ marginRight: '10px' }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  );
}

export default AdminSidebar;
