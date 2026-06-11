import { useCallback, useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { initials } from '../../utils/format';
import styles from './Logs.module.css';

const TYPE_BADGE = {
  login: 'blue',
  click: 'gray',
  admin: 'purple',
  driver: 'amber'
};

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'login', label: 'Client login' },
  { key: 'driver', label: 'Driver login' },
  { key: 'click', label: 'Page views' },
  { key: 'admin', label: 'Admin' }
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
  logs: 'System logs (admin)'
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

function logBadge(log) {
  if (isDriverLog(log)) return { class: TYPE_BADGE.driver, label: 'driver' };
  return { class: TYPE_BADGE[log.type] || 'gray', label: log.type };
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
  const whoLabel = type === 'driver' ? 'Which driver' : 'Who (client user)';

  const hasFilters =
    type !== 'all' ||
    userId !== 'all' ||
    screen !== 'all' ||
    search.trim() ||
    fromDate ||
    toDate;

  return (
    <AppShell
      title="System Logs"
      headerRight={
        <span style={{ fontSize: 12, opacity: 0.8 }}>
          {activeCount} clients · {activeDriverCount} drivers
        </span>
      }
    >
      <div className="tabs">
        {TYPE_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`tab ${type === key ? 'active' : ''}`}
            onClick={() => onTypeTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>{whoLabel}</span>
          <select
            className="field-select"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          >
            <option value="all">{type === 'driver' ? 'All drivers' : 'All users'}</option>
            {whoList.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.userName}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>What they viewed / page</span>
          <select
            className="field-select"
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
          >
            <option value="all">All screens</option>
            {screens.map((s) => (
              <option key={s} value={s}>
                {screenLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Search action</span>
          <input
            className="field-input"
            style={{ margin: 0 }}
            placeholder="e.g. logged in, driver logged in…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          />
        </div>

        <div className={styles.filterRow}>
          <span className={styles.filterLabel}>Date range</span>
          <div className={styles.dateRow}>
            <input
              type="date"
              className="field-input"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="From date"
            />
            <input
              type="date"
              className="field-input"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="To date"
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className="btn-primary" onClick={applyFilters}>
            Apply filters
          </button>
          {hasFilters && (
            <button type="button" className="btn-outline" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
      </div>

      <p className={styles.summary}>
        {loading && logs.length === 0
          ? 'Loading…'
          : `Showing ${logs.length} of ${total} log${total === 1 ? '' : 's'}`}
      </p>

      {!loading && logs.length === 0 ? (
        <p className="empty-text">No logs match these filters.</p>
      ) : (
        logs.map((log) => {
          const badge = logBadge(log);
          const driver = isDriverLog(log);
          return (
            <div
              key={log._id}
              className="card"
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: driver ? '#fdf5e0' : 'var(--blue-light)',
                  color: driver ? '#856404' : 'var(--blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                {initials(log.userName || 'AD')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{log.action}</div>
                <div className={styles.logMeta}>
                  {log.userName || 'Unknown'}
                  {log.userRole ? ` (${log.userRole})` : ''} ·{' '}
                  {new Date(log.timestamp).toLocaleString('en-IN')}
                </div>
                {log.page && (
                  <span className={styles.screenTag}>{screenLabel(log.page)}</span>
                )}
              </div>
              <span className={`badge badge-${badge.class}`}>{badge.label}</span>
            </div>
          );
        })
      )}

      {page < totalPages && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <button
            type="button"
            className="btn-outline"
            style={{ width: 'auto', padding: '6px 16px' }}
            onClick={loadMore}
            disabled={loading}
          >
            Load more
          </button>
        </div>
      )}
    </AppShell>
  );
}
