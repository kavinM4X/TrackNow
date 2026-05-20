import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatDateShort, initials } from '../../utils/format';
import styles from './Bookings.module.css';

const TABS = [
  { key: 'all', label: 'All', countKey: 'all', style: 'tabAll' },
  { key: 'pending', label: 'Pending', countKey: 'pending', style: 'tabPending' },
  { key: 'confirmed', label: 'Confirmed', countKey: 'confirmed', style: 'tabConfirmed' },
  { key: 'completed', label: 'Done', countKey: 'completed', style: 'tabDone' }
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
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function Bookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [flash, setFlash] = useState(location.state?.message || '');
  const [bookings, setBookings] = useState([]);
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

  const buildCounts = (list, fromApi) => {
    if (fromApi && fromApi.all !== undefined) return fromApi;
    return {
      all: list.length,
      pending: list.filter((b) => b.status === 'pending').length,
      confirmed: list.filter((b) => b.status === 'confirmed').length,
      completed: list.filter((b) => b.status === 'completed').length,
      cancelled: list.filter((b) => b.status === 'cancelled').length
    };
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/admin/bookings', {
        params: {
          status: tab === 'all' ? undefined : tab,
          search: search.trim() || undefined,
          _t: Date.now()
        }
      });
      const { bookings: list, counts: apiCounts } = parseBookingsResponse(res.data);
      setBookings(list);
      setCounts(buildCounts(list, apiCounts));
    } catch (e) {
      console.error(e);
      setBookings([]);
      setLoadError(
        e.response?.data?.error ||
          e.response?.data?.message ||
          'Could not load bookings. Log in as admin and restart the API server.'
      );
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

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

    const user = JSON.parse(localStorage.getItem('silktrack_user') || '{}');
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
        alert(msg || 'Update failed. Restart the backend (npm start in backend folder).');
      }
    }
  };

  const goBookingDetail = (booking, e) => {
    e.stopPropagation();
    const id = bookingIdStr(booking);
    if (id) navigate(`/admin/bookings/${id}`);
  };

  const displayName = (b) => b.userName || b.userId?.name || 'Unknown';

  return (
    <AppShell
      title="Bookings"
      headerRight={
        <button type="button" className="topLink" onClick={load} disabled={loading}>
          ↻
        </button>
      }
    >
      {flash && <p className="form-success" style={{ marginBottom: 8 }}>{flash}</p>}
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
        Tap a booking card to open Booking Detail (full info, notes, market rates).
      </p>
      <input
        className="field-input"
        placeholder="Search by user or date..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />

      <div className={styles.tabs}>
        {TABS.map(({ key, label, countKey, style }) => (
          <button
            key={key}
            type="button"
            className={`${styles.tab} ${styles[style]} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label} ({counts[countKey] ?? 0})
          </button>
        ))}
      </div>

      {loadError && <p className="form-error">{loadError}</p>}

      {loading ? (
        <div className="spinner" />
      ) : bookings.length === 0 ? (
        <p className="empty-text">
          No bookings found. Client bookings show here — tap ↻ to refresh after a farmer books.
        </p>
      ) : (
        bookings.map((b) => (
          <div
            key={b._id}
            className="card"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/admin/bookings/${b._id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/bookings/${b._id}`)}
          >
            <div className={styles.cardHead}>
              <div className={styles.avatar}>{initials(displayName(b))}</div>
              <div className={styles.cardMeta}>
                <strong>{displayName(b)}</strong>
                <span>
                  {formatDateShort(b.date)} · {b.location} · {b.quantityKg} kg
                </span>
              </div>
              <span className={`${styles.badge} ${statusBadgeClass(b.status)}`}>
                {statusLabel(b.status)}
              </span>
            </div>

            {b.status !== 'completed' && b.status !== 'cancelled' && (
              <>
                <hr className={styles.divider} />
                <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
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
                    aria-label="Cancel"
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </AppShell>
  );
}
