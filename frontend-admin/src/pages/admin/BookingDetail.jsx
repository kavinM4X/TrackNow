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
import styles from './Bookings.module.css';

function statusBadgeClass(status) {
  if (status === 'pending') return styles.badgePending;
  if (status === 'confirmed') return styles.badgeConfirmed;
  if (status === 'completed') return styles.badgeDone;
  return styles.badgeCancelled;
}

function statusLabel(status) {
  if (status === 'completed') return 'Done';
  if (status === 'confirmed') return 'Confirmed';
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
    if (status === 'cancelled' && !window.confirm('Cancel this booking?')) return;
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
      <AppShell title="Booking Detail" backPath="/admin/bookings" hideNav>
        <div className="spinner" />
      </AppShell>
    );
  }

  const locRates = marketRate
    ? [
        ['CBE', marketRate.coimbatore],
        ['MBL', marketRate.mamballi],
        ['RNG', marketRate.ramnagar],
        ['DHP', marketRate.dharmapuri]
      ]
    : [];

  return (
    <AppShell
      title="Booking Detail"
      backPath="/admin/bookings"
      hideNav
      headerRight={
        <span className={`${styles.badge} ${statusBadgeClass(booking.status)}`}>
          {statusLabel(booking.status)}
        </span>
      }
    >
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--blue)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600
          }}
        >
          {initials(user?.name || booking.userName)}
        </div>
        <div>
          <strong>{user?.name || booking.userName}</strong>
          <div style={{ fontSize: 12, color: '#888' }}>
            {shortUserId(user?._id || booking.userId)} · {user?.phone || '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title">Booking Info</p>
        {[
          ['Booking ID', formatBookingId(booking._id)],
          ['Date', formatDateShort(booking.date)],
          ['Location', booking.location],
          ['Quantity', `${booking.quantityKg} kg`],
          ['Client notes', booking.notes || '—']
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: '#888' }}>{label}</span>
            <span style={{ textAlign: 'right', maxWidth: '60%' }}>{value}</span>
          </div>
        ))}
      </div>

      {marketRate && (
        <div className="card" style={{ background: '#f8f8f6' }}>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 8px' }}>
            Market Rate on {formatDateShort(booking.date)} (reference)
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12 }}>
            {locRates.map(([abbr, val]) => (
              <span key={abbr}>
                {abbr}: <strong>₹{val}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      <label className="field-label">Admin Note (optional)</label>
      <textarea
        className="field-textarea"
        rows={3}
        placeholder="Add a note for this booking..."
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        onBlur={saveNote}
      />

      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
        <>
          {booking.status === 'pending' && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginBottom: 8 }}
              disabled={saving}
              onClick={() => patchStatus('confirmed')}
            >
              Confirm Booking
            </button>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-outline"
              style={{ borderColor: 'var(--green)', color: 'var(--green)' }}
              disabled={saving}
              onClick={markAsDone}
            >
              {saving ? 'Saving…' : 'Mark as Done'}
            </button>
            <button
              type="button"
              style={{
                flex: 1,
                padding: 10,
                border: '1px solid #f0c0c0',
                borderRadius: 8,
                background: '#f5e8e8',
                color: 'var(--danger)',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              disabled={saving}
              onClick={() => patchStatus('cancelled')}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </AppShell>
  );
}
