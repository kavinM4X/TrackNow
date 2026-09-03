import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api, { deduplicatedGet } from '../../api/client';
import { formatDateDayMonth, todayISO } from '../../utils/format';
import styles from './Booking.module.css';

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];
const WEIGHT_PRESETS = [50, 100, 250, 500];

export default function Booking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  const activeBooking = bookings.find(
    (b) => ['pending', 'confirmed', 'in_transit'].includes(b.status) && b.date >= todayISO()
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: todayISO(),
      location: localStorage.getItem('last_location') || 'Coimbatore',
      quantityKg: '',
      notes: ''
    }
  });

  const dateVal = watch('date');
  const selectedLocation = watch('location');

  const fetchBookings = async () => {
    try {
      const res = await deduplicatedGet('/bookings/my', {}, 15_000);
      setBookings(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onSubmit = async (data) => {
    setApiError('');
    setSuccess('');
    if (data.date < todayISO()) {
      setApiError('Past dates are not allowed');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        date: data.date,
        location: data.location,
        quantityKg: Number(data.quantityKg),
        notes: data.notes || ''
      });
      localStorage.setItem('last_location', data.location);
      setSuccess('✓ Booking submitted successfully! Driver tracking will activate on date of pickup.');
      reset({
        date: todayISO(),
        location: data.location,
        quantityKg: '',
        notes: ''
      });
      await fetchBookings();
    } catch (err) {
      setApiError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Could not save booking'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell title="Book Pickup" subtitle="Schedule silk cocoon pickup & driver dispatch">
      <div className={styles.container}>
        {/* Header Hero Banner */}
        <div className={styles.heroBanner}>
          <h2 className={styles.heroTitle}>📦 Farmer Harvest Pickup Booking</h2>
          <p className={styles.heroSub}>
            Schedule your cocoon harvest pickup date and nearest market center.
          </p>
        </div>

        {/* If farmer ALREADY has an active upcoming booking, show Active Status Card */}
        {activeBooking ? (
          <div className={styles.activeScheduledCard}>
            <div className={styles.activeHeader}>
              <div className={styles.activeBadge}>
                <span className={styles.greenDot} />
                <span>ACTIVE SCHEDULED PICKUP</span>
              </div>
              <Badge status={activeBooking.status} />
            </div>

            <div className={styles.activeHeroGrid}>
              <div className={styles.activeStatBox}>
                <span className={styles.activeStatLabel}>Pickup Date</span>
                <span className={styles.activeStatValue}>🗓️ {formatDateDayMonth(activeBooking.date)}</span>
              </div>
              <div className={styles.activeStatBox}>
                <span className={styles.activeStatLabel}>Market Destination</span>
                <span className={styles.activeStatValue}>📍 {activeBooking.location}</span>
              </div>
              <div className={styles.activeStatBox}>
                <span className={styles.activeStatLabel}>Estimated Harvest</span>
                <span className={styles.activeStatValue}>⚖️ {activeBooking.quantityKg} kg</span>
              </div>
            </div>

            <p className={styles.activeInfoText}>
              ✨ You already have a harvest delivery scheduled for <strong>{formatDateDayMonth(activeBooking.date)}</strong>. Once this batch is picked up and completed, you will be able to schedule your next harvest pickup.
            </p>

            <div className={styles.activeBtnRow}>
              <Link to="/tracker" className={styles.primaryTrackerBtn}>
                🗺️ View Live GPS Tracker →
              </Link>
              <Link to="/dashboard" className={styles.secondaryDashBtn}>
                📊 Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* New Booking Form only when NO active batch is pending */
          <form className={styles.formCard} onSubmit={handleSubmit(onSubmit)}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.formTitle}>✨ Create New Booking</h3>
            </div>

            {/* Date Picker */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>🗓️ Pickup Date</label>
              <input
                type="date"
                className={styles.fieldInput}
                min={todayISO()}
                {...register('date', { required: true })}
              />
              {dateVal && dateVal < todayISO() && (
                <p className="form-error">⚠ Past dates are not allowed</p>
              )}
            </div>

          {/* Location Chip Selector */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>🏛️ Delivery Market Center</label>
            <div className={styles.locationGrid}>
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`${styles.locationChip} ${
                    selectedLocation === loc ? styles.locationChipOn : ''
                  }`}
                  onClick={() => setValue('location', loc)}
                >
                  📍 {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity Input & Preset Buttons */}
          <div className={styles.fieldGroup}>
            <div className={styles.labelRow}>
              <label className={styles.fieldLabel}>⚖️ Quantity (kg)</label>
              <span style={{ fontSize: 11, color: '#64748b' }}>Quick Select:</span>
            </div>
            <input
              type="number"
              className={styles.fieldInput}
              min={1}
              max={9999}
              placeholder="Enter weight in kg (e.g. 100)"
              {...register('quantityKg', {
                required: 'Quantity required',
                min: { value: 1, message: 'Minimum 1 kg required' }
              })}
            />
            <div className={styles.presetRow}>
              {WEIGHT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={styles.presetBtn}
                  onClick={() => setValue('quantityKg', preset)}
                >
                  {preset} kg
                </button>
              ))}
            </div>
            {errors.quantityKg && (
              <p className="form-error">{errors.quantityKg.message}</p>
            )}
          </div>

          {/* Optional Notes */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>📝 Notes / Farmer Instructions (Optional)</label>
            <textarea
              className={styles.fieldTextarea}
              maxLength={200}
              placeholder="e.g. Call before coming, pickup location landmark..."
              {...register('notes')}
            />
          </div>

          {apiError && <p className="form-error">{apiError}</p>}
          {success && <p className="form-success">{success}</p>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Saving Booking…' : '✓ Confirm Pickup Booking'}
          </button>
        </form>
        )}

        {/* Existing Bookings List */}
        <div className={styles.historySection}>
          <h3 className={styles.historyTitle}>
            <span>📜</span> My Scheduled Bookings ({bookings.length})
          </h3>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
              <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
            </div>
          ) : bookings.length === 0 ? (
            <div className={styles.emptyState}>
              No bookings created yet. Complete the form above to schedule your first pickup.
            </div>
          ) : (
            bookings.map((b) => (
              <div key={b._id} className={styles.bookingCard}>
                <div className={styles.bookingLeft}>
                  <div className={styles.bookingMainText}>
                    📍 {b.location} · 🗓️ {formatDateDayMonth(b.date)}
                  </div>
                  <div className={styles.bookingSubText}>
                    📦 Harvest Weight: <strong>{b.quantityKg} kg</strong>
                    {b.notes ? ` · 📝 "${b.notes}"` : ''}
                  </div>
                </div>
                <Badge status={b.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
