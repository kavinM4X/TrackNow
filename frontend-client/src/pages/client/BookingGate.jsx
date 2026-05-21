import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../api/client';
import { formatDateShort, todayISO } from '../../utils/format';
import { hasUpcomingBooking } from '../../utils/bookingGate';
import styles from './BookingGate.module.css';

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];

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

  return (
    <div className={styles.successPage}>
      <div className={styles.header}>
        <div className={styles.welcome}>TrackNow</div>
        <h1 className={styles.title}>Booking Confirmed!</h1>
      </div>
      <div className={styles.successBody}>
        <div className={styles.successIcon}>✓</div>
        <h2 className={styles.successTitle}>Booking Confirmed!</h2>
        <p className={styles.successDetail}>
          Your batch for {formatDateShort(booking.date)}
          <br />
          at {booking.location} · {booking.quantityKg} kg
          <br />
          has been booked.
        </p>
        <div className={styles.countdownBox}>
          <div className={styles.countdownLabel}>Redirecting to Dashboard in</div>
          <div className={styles.countdownNum}>{seconds}</div>
          <div className={styles.countdownBar}>
            <div className={styles.countdownFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" className="btn-primary" onClick={onGoDashboard}>
          Go to Dashboard Now
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

  useEffect(() => {
    hasUpcomingBooking()
      .then((has) => {
        if (has) navigate('/dashboard', { replace: true });
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  useEffect(() => {
    const blockBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', blockBack);
    return () => window.removeEventListener('popstate', blockBack);
  }, []);

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
      localStorage.setItem('last_location', data.location);
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
    return <div className="app-loading">Loading…</div>;
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
      <header className={styles.header}>
        <div className={styles.welcome}>Welcome back, {firstName}</div>
        <h1 className={styles.title}>Schedule Next Batch</h1>
        <p className={styles.sub}>Please confirm your upcoming booking to continue</p>
      </header>

      <div className={styles.body}>
        <div className={styles.steps}>
          <div className={`${styles.stepDot} ${styles.stepDotActive}`}>1</div>
          <div className={styles.stepLine} />
          <div className={styles.stepDot}>2</div>
          <div className={styles.stepLine} />
          <div className={styles.stepDot}>✓</div>
        </div>
        <div className={styles.stepLabels}>
          <span className={styles.stepLabelActive}>Booking</span>
          <span className={styles.stepLabelMuted}>Review</span>
          <span className={styles.stepLabelMuted}>Done</span>
        </div>

        <form className="card" onSubmit={handleSubmit(onSubmit)}>
          <label className="field-label">Select date for upcoming batch</label>
          <input
            type="date"
            className="field-input"
            min={todayISO()}
            {...register('date', { required: true })}
          />
          {dateVal && dateVal < todayISO() && (
            <p className="form-error">⚠ Past dates are not allowed</p>
          )}

          <label className="field-label">Select market location</label>
          <select
            className="field-select"
            {...register('location', { required: true })}
            style={{ marginBottom: 8 }}
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div className={styles.locationGrid}>
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                type="button"
                className={`${styles.locationChip} ${location === loc ? styles.locationChipActive : ''}`}
                onClick={() => setValue('location', loc, { shouldValidate: true })}
              >
                <span
                  className={`${styles.chipDot} ${location === loc ? styles.chipDotActive : ''}`}
                />
                {loc}
              </button>
            ))}
          </div>

          <label className="field-label">Estimated quantity (kg)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="number"
              className="field-input"
              min={1}
              max={9999}
              placeholder="Enter weight"
              style={{ marginBottom: 0, flex: 1 }}
              {...register('quantityKg', {
                required: 'Quantity required',
                min: { value: 1, message: 'Min 1 kg' }
              })}
            />
            <span className={styles.qtySuffix}>kg</span>
          </div>
          {errors.quantityKg && (
            <p className="form-error">{errors.quantityKg.message}</p>
          )}

          {apiError && <p className="form-error">{apiError}</p>}

          <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 12 }}>
            {submitting ? 'Saving…' : 'Confirm Booking →'}
          </button>
          <p className={styles.skipNote}>You cannot skip this step</p>
        </form>
      </div>
    </div>
  );
}
