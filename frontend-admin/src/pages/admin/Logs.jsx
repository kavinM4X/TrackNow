import { useCallback, useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials } from '../../utils/format';
import styles from './Logs.module.css';

const TYPE_TABS = [
  { key: 'all', label: 'All Logs' },
  { key: 'login', label: 'Client Login' },
  { key: 'driver', label: 'Driver Login' },
  { key: 'click', label: 'Page Views' },
  { key: 'admin', label: 'Admin Logs' }
];

const SCREEN_LABELS = {
  login: 'Login (client)',
  register: 'Register (client)',
  'driver-login': 'Login (driver)',
  'driver-register': 'Register (driver)',
  dashboard: 'Dashboard (client)',
  booking: 'Booking (client)',
  'batch-history': 'Batch history (client)',
  tracker: 'Live tracker (client)',
  settings: 'Settings (client)',
  users: 'Users (admin)',
  'create-user': 'Create user (admin)',
  'edit-user': 'Edit user (admin)',
  bookings: 'Bookings (admin)',
  'batch-entry': 'Batch entry (admin)',
  'tracker-control': 'Tracker control (admin)',
  'market-rates': 'Market rates (admin)',
  logs: 'System logs (admin)',
  'admin-dashboard': 'Dashboard (admin)',
  expense: 'Expense (driver)',
  parties: 'Parties (driver)',
  history: 'History (driver)',
  profile: 'Profile (driver)',
  'booking-gate': 'Booking gate (client)'
};

function screenLabel(key) {
  if (!key) return '';
  return SCREEN_LABELS[key] || key.replace(/-/g, ' ');
}

function isDriverLog(log) {
  return (
    log.userRole === 'driver' ||
    log.userRole === 'staff' ||
    log.page === 'driver-login' ||
    log.page === 'driver-register'
  );
}

function logBadgeInfo(log) {
  if (isDriverLog(log)) return { style: styles.badgeAmber, label: 'Driver' };
  if (log.type === 'admin') return { style: styles.badgePurple, label: 'Admin' };
  if (log.type === 'login') return { style: styles.badgeBlue, label: 'Login' };
  return { style: styles.badgeGray, label: log.type || 'Activity' };
}

function tabQueryParams(tab) {
  if (tab === 'driver') return { role: 'driver' };
  if (tab === 'login') return { role: 'client' };
  if (tab !== 'all') return { type: tab };
  return {};
}

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [type, setType] = useState('all');
  const [userId, setUserId] = useState('all');
  const [screen, setScreen] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [activeDriverCount, setActiveDriverCount] = useState(0);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback(
    (p = 1) => {
      const params = { page: p, limit: 50, ...tabQueryParams(type) };
      if (userId !== 'all') params.userId = userId;
      if (screen !== 'all') params.screen = screen;
      if (search.trim()) params.search = search.trim();
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      return params;
    },
    [type, userId, screen, search, fromDate, toDate]
  );

  const fetchLogs = useCallback(
    async (p = 1, append = false) => {
      setLoading(!append);
      try {
        const res = await api.get('/admin/logs', { params: buildParams(p) });
        setLogs((prev) => (append ? [...prev, ...res.data.logs] : res.data.logs));
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
        setPage(res.data.page);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    api.get('/admin/active-users-count').then((r) => {
      setActiveCount(r.data.count);
      setActiveDriverCount(r.data.driverCount || 0);
    });
    api
      .get('/admin/logs/filter-options')
      .then((r) => {
        setUsers(r.data.users || []);
        setDrivers(r.data.drivers || []);
        setScreens(r.data.screens || []);
      })
      .catch(console.error);
    fetchLogs(1, false);
  }, []);

  const applyFilters = () => {
    setPage(1);
    fetchLogs(1, false);
  };

  const clearFilters = () => {
    setType('all');
    setUserId('all');
    setScreen('all');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
    setLoading(true);
    api
      .get('/admin/logs', { params: { page: 1, limit: 50 } })
      .then((res) => {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  const onTypeTab = (t) => {
    setType(t);
    setUserId('all');
    setPage(1);
    const params = { page: 1, limit: 50, ...tabQueryParams(t) };
    if (screen !== 'all') params.screen = screen;
    if (search.trim()) params.search = search.trim();
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    setLoading(true);
    api
      .get('/admin/logs', { params })
      .then((res) => {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  };

  const loadMore = () => {
    if (page < totalPages) fetchLogs(page + 1, true);
  };

  const whoList = type === 'driver' ? drivers : users;
  const whoLabel = type === 'driver' ? 'Filter by Driver' : 'Filter by User';

  const hasFilters =
    type !== 'all' ||
    userId !== 'all' ||
    screen !== 'all' ||
    search.trim() ||
    fromDate ||
    toDate;

  return (
    <AppShell title="System Activity Logs">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>System Activity Logs</h2>
            <p className={styles.headerSub}>Real-time system events, user logins, driver actions & page views</p>
          </div>
          <div className={styles.activeUsersChip}>
            ⚡ {activeCount} Active Clients · {activeDriverCount} Drivers
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className={styles.tabsSegmented}>
          {TYPE_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`${styles.tabBtn} ${type === key ? styles.tabBtnActive : ''}`}
              onClick={() => onTypeTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Expandable Filter Card */}
        <div className={styles.filterCard}>
          <div className={styles.filterGrid}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>{whoLabel}</label>
              <select
                className={styles.fieldSelect}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                <option value="all">{type === 'driver' ? 'All Drivers' : 'All Client Users'}</option>
                {whoList.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.userName}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Page / Screen Viewed</label>
              <select
                className={styles.fieldSelect}
                value={screen}
                onChange={(e) => setScreen(e.target.value)}
              >
                <option value="all">All Screens</option>
                {screens.map((s) => (
                  <option key={s} value={s}>
                    {screenLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Search Action</label>
              <input
                className={styles.fieldInput}
                placeholder="Search action text (e.g. logged in)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Date Range</label>
              <div className={styles.dateRow}>
                <input
                  type="date"
                  className={styles.fieldInput}
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  aria-label="From date"
                />
                <input
                  type="date"
                  className={styles.fieldInput}
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.applyBtn} onClick={applyFilters}>
              Apply Filters
            </button>
            {hasFilters && (
              <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Log Summary Count */}
        <p className={styles.summaryText}>
          {loading && logs.length === 0
            ? 'Loading activity logs…'
            : `Showing ${logs.length} of ${total} recorded log event${total === 1 ? '' : 's'}`}
        </p>

        {/* Logs Feed List */}
        {loading && logs.length === 0 ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.emptyState}>No activity logs match these filters.</div>
        ) : (
          <div className={styles.logsList}>
            {logs.map((log) => {
              const badge = logBadgeInfo(log);
              const driver = isDriverLog(log);
              const admin = log.type === 'admin' || log.userRole === 'admin';
              const userInitials = initials(log.userName || 'AD');

              const avatarStyle = admin
                ? styles.avatarAdmin
                : driver
                ? styles.avatarDriver
                : styles.avatarClient;

              return (
                <div key={log._id} className={styles.logCard}>
                  <div className={`${styles.avatar} ${avatarStyle}`}>
                    {userInitials}
                  </div>

                  <div className={styles.logBody}>
                    <div className={styles.actionText}>{log.action}</div>
                    <div className={styles.logMeta}>
                      <span>👤 {log.userName || 'Unknown User'}</span>
                      {log.userRole && <span>({log.userRole})</span>}
                      <span>·</span>
                      <span>🕒 {new Date(log.timestamp).toLocaleString('en-IN')}</span>
                    </div>
                    {log.page && (
                      <span className={styles.screenTag}>📄 {screenLabel(log.page)}</span>
                    )}
                  </div>

                  <span className={`${styles.badge} ${badge.style}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Load More Button */}
        {page < totalPages && (
          <div className={styles.loadMoreBox}>
            <button
              type="button"
              className={styles.loadMoreBtn}
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? 'Loading More…' : `Load More Logs (${total - logs.length} remaining)`}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
