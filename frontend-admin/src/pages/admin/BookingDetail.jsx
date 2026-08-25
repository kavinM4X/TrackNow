import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import {
  formatBookingId,
  formatDateShort,
  initials,
  shortUserId
} from '../../utils/format';
import styles from './BookingDetail.module.css';

function statusBadgeClass(status) {
  if (status === 'pending') return styles.badgePending;
  if (status === 'confirmed') return styles.badgeConfirmed;
  if (status === 'completed') return styles.badgeDone;
  return styles.badgeCancelled;
}

function statusLabel(status) {
  if (status === 'completed') return '✓ Done';
  if (status === 'confirmed') return '● Confirmed';
  if (status === 'pending') return '⏳ Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const LOC_RATE_KEY = {
  Coimbatore: 'coimbatore',
  Mamballi: 'mamballi',
  Ramnagar: 'ramnagar',
  Dharmapuri: 'dharmapuri'
};

export default function BookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [marketRate, setMarketRate] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get(`/admin/bookings/${bookingId}`)
      .then((res) => {
        setBooking(res.data.booking);
        setUser(res.data.user);
        setMarketRate(res.data.marketRate);
        setAdminNote(res.data.booking.adminNote || '');
      })
      .catch(() => navigate('/admin/bookings', { replace: true }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const resolveUserId = () => {
    const uid = user?._id || booking.userId?._id || booking.userId;
    return uid ? String(uid) : '';
  };

  const markAsDone = async () => {
    const uid = resolveUserId();
    if (!uid) {
      alert('User not found for this booking.');
      return;
    }
    setSaving(true);
    try {
      if (adminNote.trim()) {
        await api.post('/admin/bookings/update-status', { bookingId, adminNote });
      }
      await api.post('/admin/batches', {
        userId: uid,
        date: booking.date,
        location: booking.location,
        goodSilkKg: booking.quantityKg,
        wasteKg: 0,
        doubles: 0,
        goodSilkRatePerKg: marketRate?.[LOC_RATE_KEY[booking.location]] ?? 0,
        wasteRatePerKg: 0,
        doublesRatePerKg: 0,
        linkedBookingId: booking._id,
        notes: adminNote.trim() || booking.notes || ''
      });
      navigate('/admin/bookings', {
        state: {
          message: `Batch saved (${booking.quantityKg} kg) — booking marked done.`
        }
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save batch entry');
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (status) => {
    if (status === 'cancelled' && !window.confirm('Are you sure you want to cancel this pickup booking?')) return;
    setSaving(true);
    try {
      await api.post('/admin/bookings/update-status', {
        bookingId,
        status,
        adminNote
      });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const saveNote = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await api.post('/admin/bookings/update-status', { bookingId, adminNote });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !booking) {
    return (
      <AppShell title="Booking Specification" backPath="/admin/bookings">
        <div className="app-loading">
          <div className="spinner" />
        </div>
      </AppShell>
    );
  }

  const locRates = marketRate
    ? [
        ['Coimbatore', 'CBE', marketRate.coimbatore],
        ['Mamballi', 'MBL', marketRate.mamballi],
        ['Ramnagar', 'RNG', marketRate.ramnagar],
        ['Dharmapuri', 'DHP', marketRate.dharmapuri]
      ]
    : [];

  const uid = resolveUserId();

  return (
    <AppShell title="Booking Specification" backPath="/admin/bookings">
      <div className={styles.container}>
        {/* User Hero Card */}
        <div className={styles.userHeroCard}>
          <div className={styles.userLeft}>
            <div className={styles.avatarRing}>
              {initials(user?.name || booking.userName)}
            </div>
            <div className={styles.userMeta}>
              <h2 className={styles.userName}>{user?.name || booking.userName}</h2>
              <div className={styles.userSub}>
                ID: <strong>{shortUserId(user?._id || booking.userId)}</strong>
                {user?.phone && (
                  <span>
                    · 📞{' '}
                    <a href={`tel:${user.phone}`} className={styles.phoneLink}>
                      {user.phone}
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.userRightGroup}>
            <span className={`${styles.statusBadge} ${statusBadgeClass(booking.status)}`}>
              {statusLabel(booking.status)}
            </span>
            {uid && (
              <button
                type="button"
                className={styles.historyShortcutBtn}
                onClick={() => navigate(`/admin/batch-history/user/${uid}`)}
              >
                <span>📜</span> History
              </button>
            )}
          </div>
        </div>

        {/* Specifications Card */}
        <div className={styles.detailsCard}>
          <h3 className={styles.cardTitle}>
            <span>📋</span> Pickup Order Specifications
          </h3>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>🔢 Booking Reference ID</span>
            <span className={styles.detailValue} style={{ color: 'var(--blue, #1e4d7b)' }}>
              {formatBookingId(booking._id)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>🗓️ Scheduled Date</span>
            <span className={styles.detailValue}>
              {formatDateShort(booking.date)}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>📍 Market Location</span>
            <span className={styles.detailValue} style={{ color: 'var(--green, #2e7d52)' }}>
              {booking.location} Center
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>📦 Harvest Quantity</span>
            <span className={styles.detailValue} style={{ fontSize: 16, color: 'var(--green, #2e7d52)' }}>
              {booking.quantityKg} kg
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>📝 Farmer Notes</span>
            <span className={styles.detailValue} style={{ fontWeight: 500, color: '#475569' }}>
              {booking.notes ? `"${booking.notes}"` : '—'}
            </span>
          </div>
        </div>

        {/* Reference Market Rates Card */}
        {marketRate && (
          <div className={styles.marketRefCard}>
            <h4 className={styles.marketRefTitle}>
              📈 Market Rates Reference ({formatDateShort(booking.date)})
            </h4>
            <div className={styles.marketPillGrid}>
              {locRates.map(([fullLoc, abbr, val]) => {
                const isActive = booking.location === fullLoc;
                return (
                  <div
                    key={abbr}
                    className={`${styles.marketPill} ${isActive ? styles.marketPillActive : ''}`}
                  >
                    <span className={styles.marketAbbr}>{abbr}</span>
                    <span
                      className={`${styles.marketRateVal} ${
                        isActive ? styles.marketRateValActive : ''
                      }`}
                    >
                      ₹{val ?? '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Admin Note Section */}
        <div className={styles.noteGroup}>
          <label className={styles.noteLabel}>📝 Admin Processing Notes (Internal)</label>
          <textarea
            className={styles.noteTextarea}
            rows={3}
            placeholder="Add administrative or logistics instructions for this pickup..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            onBlur={saveNote}
          />
        </div>

        {/* Status Actions */}
        {booking.status !== 'completed' && booking.status !== 'cancelled' && (
          <div className={styles.actionsGroup}>
            {booking.status === 'pending' && (
              <button
                type="button"
                className={styles.primaryActionBtn}
                disabled={saving}
                onClick={() => patchStatus('confirmed')}
              >
                {saving ? 'Updating…' : '✓ Confirm Booking Order'}
              </button>
            )}

            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.doneActionBtn}
                disabled={saving}
                onClick={markAsDone}
              >
                {saving ? 'Saving…' : '📦 Mark Complete & Save Batch'}
              </button>

              <button
                type="button"
                className={styles.cancelActionBtn}
                disabled={saving}
                onClick={() => patchStatus('cancelled')}
              >
                ✕ Cancel Pickup
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
