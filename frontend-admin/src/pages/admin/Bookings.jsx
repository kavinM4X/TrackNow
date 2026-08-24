import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { getStoredUser } from '../../api/client';
import { formatDateShort, initials } from '../../utils/format';
import styles from './Bookings.module.css';

const TABS = [
  { key: 'all', label: 'All', countKey: 'all' },
  { key: 'pending', label: 'Pending', countKey: 'pending' },
  { key: 'confirmed', label: 'Confirmed', countKey: 'confirmed' },
  { key: 'completed', label: 'Done', countKey: 'completed' },
  { key: 'cancelled', label: 'Cancelled', countKey: 'cancelled' }
];

function statusBadgeClass(status) {
  if (status === 'pending') return styles.badgePending;
  if (status === 'confirmed') return styles.badgeConfirmed;
  if (status === 'completed') return styles.badgeDone;
  if (status === 'cancelled') return styles.badgeCancelled;
  return styles.badgePending;
}

function statusLabel(status) {
  if (status === 'completed') return 'Done';
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'cancelled') return 'Cancelled';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Bookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.message || '');
  const [allBookings, setAllBookings] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const parseBookingsResponse = (data) => {
    if (Array.isArray(data)) {
      return { bookings: data, counts: null };
    }
    return {
      bookings: data?.bookings || [],
      counts: data?.counts || null
    };
  };

  const buildCounts = (list) => ({
    all: list.length,
    pending: list.filter((b) => b.status === 'pending').length,
    confirmed: list.filter((b) => b.status === 'confirmed').length,
    completed: list.filter((b) => b.status === 'completed').length,
    cancelled: list.filter((b) => b.status === 'cancelled').length
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/admin/bookings', {
        params: {
          search: search.trim() || undefined,
          _t: Date.now()
        }
      });
      const { bookings: list, counts: apiCounts } = parseBookingsResponse(res.data);
      setAllBookings(list);
      setCounts(apiCounts?.all !== undefined ? apiCounts : buildCounts(list));
    } catch (e) {
      console.error(e);
      setAllBookings([]);
      setLoadError(
        e.response?.data?.error ||
          e.response?.data?.message ||
          'Could not load bookings. Log in as admin and restart the API server.'
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  const bookings = useMemo(() => {
    let list = allBookings;
    if (tab !== 'all') {
      list = list.filter((b) => b.status === tab);
    }
    return list;
  }, [allBookings, tab]);

  useEffect(() => {
    if (location.state?.message) {
      setFlash(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const bookingIdStr = (b) => String(b._id || b.id || '');

  const patchStatus = async (booking, status, e) => {
    e?.stopPropagation();
    if (status === 'cancelled' && !window.confirm('Cancel this booking?')) return;
    const id = bookingIdStr(booking);
    if (!id) return;

    const user = getStoredUser() || {};
    if (user.role !== 'admin') {
      alert('Admin login required. Open Admin Portal and log in again.');
      return;
    }

    try {
      await api.post('/admin/bookings/update-status', { bookingId: id, status });
      load();
    } catch (err) {
      const code = err.response?.status;
      const msg = err.response?.data?.error || err.response?.data?.message;
      if (code === 401 || code === 403) {
        alert('Session expired or not admin. Log in again at /admin/login');
      } else if (code === 404) {
        alert(msg || 'Booking not found. Tap ↻ to refresh the list.');
        load();
      } else {
        alert(msg || 'Update failed. Restart the backend.');
      }
    }
  };

  const goBookingDetail = (booking, e) => {
    e.stopPropagation();
    const id = bookingIdStr(booking);
    if (id) navigate(`/admin/bookings/${id}`);
  };

  const displayName = (b) => b.userName || b.userId?.name || 'Farmer User';

  return (
    <AppShell title="Bookings Management">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Sericulture Bookings</h2>
            <p className={styles.headerSub}>Manage farmer silk cocoon bookings & batch settlements</p>
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={load}
            disabled={loading}
            title="Refresh Bookings"
          >
            ↻
          </button>
        </div>

        {flash && <p className="form-success">{flash}</p>}
        {loadError && <p className="form-error">{loadError}</p>}

        {/* Stats Summary Row */}
        <div className={styles.statsRow}>
          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>📋</div>
            <div>
              <div className={styles.statNumber}>{counts.all ?? 0}</div>
              <div className={styles.statLabel}>Total Bookings</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconAmber}`}>⏳</div>
            <div>
              <div className={styles.statNumber}>{counts.pending ?? 0}</div>
              <div className={styles.statLabel}>Pending Action</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconBlue}`}>👍</div>
            <div>
              <div className={styles.statNumber}>{counts.confirmed ?? 0}</div>
              <div className={styles.statLabel}>Confirmed</div>
            </div>
          </div>

          <div className={styles.statMiniCard}>
            <div className={`${styles.statIcon} ${styles.statIconGreen}`}>✅</div>
            <div>
              <div className={styles.statNumber}>{counts.completed ?? 0}</div>
              <div className={styles.statLabel}>Completed / Done</div>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by farmer name, location, or date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.tabsSegmented}>
            {TABS.map(({ key, label, countKey }) => (
              <button
                key={key}
                type="button"
                className={`${styles.tabBtn} ${tab === key ? styles.tabBtnActive : ''}`}
                onClick={() => setTab(key)}
              >
                {label} ({counts[countKey] ?? 0})
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List / Grid */}
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            No bookings found. Farmer bookings will appear here automatically.
          </div>
        ) : (
          <div className={styles.bookingGrid}>
            {bookings.map((b) => {
              const name = displayName(b);
              const userInitials = initials(name);

              return (
                <div
                  key={b._id}
                  className={styles.bookingCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/admin/bookings/${b._id}`)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && navigate(`/admin/bookings/${b._id}`)
                  }
                >
                  <div className={styles.cardHead}>
                    <div className={styles.avatar}>{userInitials}</div>
                    <div className={styles.cardMeta}>
                      <h3 className={styles.farmerName}>{name}</h3>
                      <div className={styles.subMeta}>
                        <span>🗓️ {formatDateShort(b.date)}</span>
                        {b.location && <span>📍 {b.location}</span>}
                        <span className={styles.chipTag}>{b.quantityKg} kg</span>
                      </div>
                    </div>
                    <span className={`${styles.badge} ${statusBadgeClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  {b.status !== 'completed' && b.status !== 'cancelled' && (
                    <div className={styles.cardFooter} onClick={(e) => e.stopPropagation()}>
                      {b.status === 'pending' && (
                        <button
                          type="button"
                          className={styles.btnConfirm}
                          onClick={(e) => patchStatus(b, 'confirmed', e)}
                        >
                          Confirm
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.btnDone}
                        onClick={(e) => goBookingDetail(b, e)}
                      >
                        Mark Done
                      </button>
                      <button
                        type="button"
                        className={styles.btnCancel}
                        onClick={(e) => patchStatus(b, 'cancelled', e)}
                        title="Cancel Booking"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
