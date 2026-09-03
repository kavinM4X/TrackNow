import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api, { logClick } from '../../api/client';
import { formatDateShort, todayISO } from '../../utils/format';
import { hasUpcomingBooking } from '../../utils/bookingGate';
import styles from './BookingGate.module.css';

const LOCATIONS = [
  { name: 'Coimbatore', region: 'Tamil Nadu • Main Hub', icon: '🏬' },
  { name: 'Mamballi', region: 'Karnataka Border Center', icon: '📍' },
  { name: 'Ramnagar', region: 'Silk Cocoon Exchange', icon: '🏛️' },
  { name: 'Dharmapuri', region: 'Tamil Nadu Region', icon: '🌿' }
];

const WEIGHT_PRESETS = [25, 50, 100, 250, 500];

function BookingGateSuccess({ booking, onGoDashboard }) {
  const [seconds, setSeconds] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    if (seconds <= 0) {
      navigate('/dashboard', { replace: true });
      return undefined;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, navigate]);

  const pct = ((3 - seconds) / 3) * 100;
  const bookingId = `TN-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <div className={styles.successPage}>
      <div className={styles.header}>
        <div className={styles.headerBadge}>
          <span className={styles.greenPulse} />
          <span>SERICULTURE PORTAL</span>
        </div>
        <h1 className={styles.title}>Booking Confirmed</h1>
        <p className={styles.sub}>Your cocoon batch is registered on the cluster</p>
      </div>

      <div className={styles.successBody}>
        {/* Animated Check Icon */}
        <div className={styles.successIconWrapper}>
          <div className={styles.successIcon}>✓</div>
        </div>

        <h2 className={styles.successTitle}>Batch Scheduled!</h2>
        <p className={styles.successSub}>
          Thank you. Your upcoming batch has been assigned to <strong>{booking.location} Market</strong>.
        </p>

        {/* Digital Ticket / Receipt Card */}
        <div className={styles.receiptTicket}>
          <div className={styles.ticketHeader}>
            <span className={styles.ticketBrand}>TRACKNOW BATCH RECEIPT</span>
            <span className={styles.ticketId}>{bookingId}</span>
          </div>

          <div className={styles.ticketBody}>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Destination Market</span>
              <span className={styles.receiptValue}>{booking.location} Market</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Scheduled Date</span>
              <span className={styles.receiptValue}>{formatDateShort(booking.date)}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Estimated Quantity</span>
              <span className={styles.receiptValue}>{booking.quantityKg} kg</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Status</span>
              <span className={styles.statusBadge}>CONFIRMED</span>
            </div>
          </div>

          <div className={styles.ticketFooter}>
            <svg width="100%" height="24" viewBox="0 0 200 24" fill="none" opacity="0.3">
              <path d="M0 4h4v16H0V4zm6 0h2v16H6V4zm4 0h6v16h-6V4zm8 0h2v16h-2V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4zm4 0h6v16h-6V4zm8 0h4v16h-4V4zm6 0h2v16h-2V4zm4 0h6v16h-6V4zm8 0h2v16h-2V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4zm4 0h6v16h-6V4zm8 0h4v16h-4V4zm6 0h2v16h-2V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4z" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Redirect Timer */}
        <div className={styles.countdownBox}>
          <div className={styles.countdownRow}>
            <span>Redirecting to Dashboard</span>
            <strong className={styles.countdownNum}>{seconds}s</strong>
          </div>
          <div className={styles.countdownBar}>
            <div className={styles.countdownFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <button type="button" className={styles.primaryBtn} onClick={onGoDashboard}>
          Go to Dashboard Now →
        </button>
      </div>
    </div>
  );
}

export default function BookingGate({ user }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState('form');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: todayISO(),
      location: localStorage.getItem('last_location') || 'Coimbatore',
      quantityKg: ''
    }
  });

  const location = watch('location');
  const dateVal = watch('date');
  const qtyVal = watch('quantityKg');

  useEffect(() => {
    hasUpcomingBooking()
      .then((has) => {
        if (has) navigate('/dashboard', { replace: true });
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  useEffect(() => {
    logClick('viewed booking-gate', 'booking-gate');
  }, []);

  const handleSelectPreset = (presetKg) => {
    setValue('quantityKg', String(presetKg), { shouldValidate: true });
  };

  const onSubmit = async (data) => {
    setApiError('');
    if (data.date < todayISO()) {
      setApiError('Past dates are not allowed');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/bookings', {
        date: data.date,
        location: data.location,
        quantityKg: Number(data.quantityKg),
        notes: ''
      });
      const uid = user?._id || user?.id || 'anon';
      localStorage.setItem(`has_active_booking_${uid}`, 'true');
      localStorage.setItem(`last_booking_date_${uid}`, data.date);
      localStorage.setItem(`last_location_${uid}`, data.location);
      setConfirmedBooking(res.data);
      setStep('success');
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

  if (checking) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Checking active batch schedule...</p>
      </div>
    );
  }

  if (step === 'success' && confirmedBooking) {
    return (
      <BookingGateSuccess
        booking={confirmedBooking}
        onGoDashboard={() => navigate('/dashboard', { replace: true })}
      />
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  return (
    <div className={styles.page}>
      {/* Sleek Gradient Header Banner */}
      <header className={styles.header}>
        <div className={styles.headerBadge}>
          <span className={styles.greenPulse} />
          <span>FARMER PORTAL</span>
        </div>
        <div className={styles.welcome}>Welcome back, {firstName}</div>
        <h1 className={styles.title}>Schedule Upcoming Batch</h1>
        <p className={styles.sub}>Confirm your next cocoon market delivery details</p>
      </header>

      <div className={styles.body}>
        {/* Modern Segmented Stepper Bar */}
        <div className={styles.stepperCard}>
          <div className={styles.steps}>
            <div className={`${styles.stepDot} ${styles.stepDotActive}`}>1</div>
            <div className={`${styles.stepLine} ${styles.stepLineActive}`} />
            <div className={styles.stepDot}>2</div>
            <div className={styles.stepLine} />
            <div className={styles.stepDot}>✓</div>
          </div>
          <div className={styles.stepLabels}>
            <span className={styles.stepLabelActive}>Batch Form</span>
            <span className={styles.stepLabelMuted}>Confirmation</span>
            <span className={styles.stepLabelMuted}>Dashboard</span>
          </div>
        </div>

        {/* Main Form Card */}
        <form className={styles.formCard} onSubmit={handleSubmit(onSubmit)}>
          {/* Form Section 1: Date */}
          <div className={styles.formSection}>
            <label className={styles.inputLabel}>
              <span>📅 Scheduled Delivery Date</span>
              <span className={styles.requiredTag}>Required</span>
            </label>
            <div className={styles.inputWrapper}>
              <input
                type="date"
                className={styles.textInput}
                min={todayISO()}
                {...register('date', { required: 'Date is required' })}
              />
            </div>
            {dateVal && dateVal < todayISO() && (
              <div className={styles.fieldError}>⚠ Past dates are not permitted</div>
            )}
          </div>

          {/* Form Section 2: Location Grid */}
          <div className={styles.formSection}>
            <label className={styles.inputLabel}>
              <span>📍 Market Center Destination</span>
              <span className={styles.requiredTag}>Required</span>
            </label>

            <select
              className={styles.selectInput}
              {...register('location', { required: true })}
            >
              {LOCATIONS.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name} ({loc.region})
                </option>
              ))}
            </select>

            <div className={styles.locationGrid}>
              {LOCATIONS.map((loc) => {
                const isActive = location === loc.name;
                return (
                  <button
                    key={loc.name}
                    type="button"
                    className={`${styles.locationChip} ${isActive ? styles.locationChipActive : ''}`}
                    onClick={() => setValue('location', loc.name, { shouldValidate: true })}
                  >
                    <span className={styles.chipIcon}>{loc.icon}</span>
                    <div className={styles.chipText}>
                      <div className={styles.chipName}>{loc.name}</div>
                      <div className={styles.chipRegion}>{loc.region}</div>
                    </div>
                    {isActive && <div className={styles.checkBadge}>✓</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Section 3: Quantity & Presets */}
          <div className={styles.formSection}>
            <label className={styles.inputLabel}>
              <span>⚖️ Estimated Quantity</span>
              <span className={styles.requiredTag}>Required</span>
            </label>

            <div className={styles.qtyInputGroup}>
              <input
                type="number"
                className={styles.qtyInput}
                min={1}
                max={9999}
                placeholder="Enter weight in kg..."
                {...register('quantityKg', {
                  required: 'Quantity required',
                  min: { value: 1, message: 'Minimum 1 kg required' }
                })}
              />
              <span className={styles.qtyUnit}>kg</span>
            </div>

            {/* Quick Touch Presets */}
            <div className={styles.presetContainer}>
              <span className={styles.presetTitle}>Quick select presets:</span>
              <div className={styles.presetGrid}>
                {WEIGHT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.presetBtn} ${Number(qtyVal) === preset ? styles.presetBtnActive : ''}`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    {preset} kg
                  </button>
                ))}
              </div>
            </div>

            {errors.quantityKg && (
              <div className={styles.fieldError}>{errors.quantityKg.message}</div>
            )}
          </div>

          {/* Real-time Summary Card */}
          {qtyVal && Number(qtyVal) > 0 && (
            <div className={styles.summaryCard}>
              <div className={styles.summaryTitle}>
                <span>BATCH BOOKING PREVIEW</span>
                <span className={styles.liveTag}>LIVE</span>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCell}>
                  <span className={styles.cellLabel}>Market</span>
                  <strong className={styles.cellVal}>{location}</strong>
                </div>
                <div className={styles.summaryCell}>
                  <span className={styles.cellLabel}>Date</span>
                  <strong className={styles.cellVal}>{formatDateShort(dateVal)}</strong>
                </div>
                <div className={styles.summaryCell}>
                  <span className={styles.cellLabel}>Est. Quantity</span>
                  <strong className={styles.cellVal}>{qtyVal} kg</strong>
                </div>
              </div>
            </div>
          )}

          {apiError && <div className={styles.apiErrorBox}>{apiError}</div>}

          {/* Submit Button */}
          <button
            type="submit"
            className={styles.primaryBtn}
            disabled={submitting}
          >
            {submitting ? (
              <span className={styles.btnLoading}>
                <span className={styles.btnSpinner} />
                <span>Confirming Booking...</span>
              </span>
            ) : (
              <span>Confirm Booking & Continue →</span>
            )}
          </button>

          <p className={styles.policyNote}>
            🔒 Secure registration. Complete this step to unlock your farmer dashboard.
          </p>
        </form>
      </div>
    </div>
  );
}
