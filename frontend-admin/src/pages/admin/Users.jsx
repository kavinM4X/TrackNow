import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials, shortUserId } from '../../utils/format';
import styles from './Users.module.css';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => {
    api
      .get('/admin/users')
      .then((r) => setUsers(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const matchSearch =
      (u.name && u.name.toLowerCase().includes(s)) ||
      (u.phone && u.phone.includes(s)) ||
      (u.role && u.role.toLowerCase().includes(s));

    if (tab === 'active') return matchSearch && u.isActive;
    if (tab === 'disabled') return matchSearch && !u.isActive;
    if (tab === 'users') return matchSearch && u.role === 'user';
    if (tab === 'drivers') return matchSearch && (u.role === 'driver' || u.role === 'staff');
    return matchSearch;
  });

  const userCount = users.filter((u) => u.role === 'user').length;
  const driverCount = users.filter((u) => u.role === 'driver' || u.role === 'staff').length;
  const activeCount = users.filter((u) => u.isActive).length;
  const disabledCount = users.filter((u) => !u.isActive).length;

  const toggle = async (u, e) => {
    e.stopPropagation();
    if (u.isActive && !window.confirm(`Disable ${u.name}? This will also disable their tracker.`)) {
      return;
    }
    try {
      const res = await api.patch(`/admin/users/${u._id}/toggle-status`);
      setUsers((prev) => prev.map((x) => (x._id === u._id ? res.data : x)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle status');
    }
  };

  const getRoleStyle = (role) => {
    switch (role) {
      case 'driver':
      case 'staff':
        return { label: 'Driver / Staff', bg: '#f3e8ff', color: '#7c3aed' };
      case 'admin':
        return { label: 'Admin', bg: '#fce7f3', color: '#db2777' };
      default:
        return { label: 'Farmer / User', bg: '#eff6ff', color: '#2563eb' };
    }
  };

  return (
    <AppShell title="Users Management">
      <div className={styles.container}>
        {/* Top Header & Actions Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>User Accounts</h2>
            <p className={styles.headerSub}>Manage farmers, drivers, and system administrators</p>
          </div>
          <div className={styles.actionGroup}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => navigate('/admin/tracker-control')}
            >
              📍 Tracker Control
            </button>
            <button
              type="button"
              className={styles.createBtn}
              onClick={() => navigate('/admin/users/create')}
            >
              <span>+</span> Create Account
            </button>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>👥</div>
            <div>
              <div className={styles.statNumber}>{users.length}</div>
              <div className={styles.statLabel}>Total Accounts</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>⚡</div>
            <div>
              <div className={styles.statNumber}>{activeCount}</div>
              <div className={styles.statLabel}>Active Accounts</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconPurple}`}>🚛</div>
            <div>
              <div className={styles.statNumber}>{driverCount}</div>
              <div className={styles.statLabel}>Drivers & Staff</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconRed}`}>🔒</div>
            <div>
              <div className={styles.statNumber}>{disabledCount}</div>
              <div className={styles.statLabel}>Disabled Accounts</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Section */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name, phone, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.tabsSegmented}>
            {[
              ['all', `All (${users.length})`],
              ['users', `Farmers / Users (${userCount})`],
              ['drivers', `Drivers (${driverCount})`],
              ['active', `Active (${activeCount})`],
              ['disabled', `Disabled (${disabledCount})`]
            ].map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`${styles.tabBtn} ${tab === k ? styles.tabBtnActive : ''}`}
                onClick={() => setTab(k)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* User Cards Grid */}
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>No users match your search filter.</div>
        ) : (
          <div className={styles.userGrid}>
            {filtered.map((u) => {
              const roleInfo = getRoleStyle(u.role);
              const userInitials = initials(u.name);

              return (
                <div
                  key={u._id}
                  className={styles.userCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/users/${u._id}/edit`)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && navigate(`/admin/users/${u._id}/edit`)
                  }
                >
                  <div className={styles.userCardTop}>
                    <div className={styles.userInfo}>
                      <div
                        className={`${styles.userAvatar} ${
                          u.isActive ? styles.avatarActive : styles.avatarDisabled
                        }`}
                      >
                        {userInitials}
                      </div>
                      <div className={styles.userMeta}>
                        <h3 className={styles.userName}>{u.name}</h3>
                        <span className={styles.userPhone}>📱 {u.phone || 'No Phone'}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.userCardDetails}>
                    <span
                      className={styles.roleBadge}
                      style={{ background: roleInfo.bg, color: roleInfo.color }}
                    >
                      {roleInfo.label}
                    </span>
                    <span className={styles.idTag}>{shortUserId(u._id)}</span>
                  </div>

                  <div className={styles.userCardFooter}>
                    <div className={styles.statusIndicator}>
                      <span
                        className={u.isActive ? styles.dotActive : styles.dotDisabled}
                      />
                      <span
                        style={{
                          color: u.isActive ? '#059669' : '#dc2626'
                        }}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`${styles.toggleSwitch} ${
                        u.isActive ? styles.toggleSwitchOn : ''
                      }`}
                      onClick={(e) => toggle(u, e)}
                      title={u.isActive ? 'Disable User' : 'Enable User'}
                    >
                      <span
                        className={`${styles.toggleHandle} ${
                          u.isActive ? styles.toggleHandleOn : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
