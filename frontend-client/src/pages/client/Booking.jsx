import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import api from '../../api/client';
import { formatDateShort, todayISO } from '../../utils/format';

const LOCATIONS = ['Coimbatore', 'Mamballi', 'Ramnagar', 'Dharmapuri'];

export default function Booking() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
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

  const fetchBookings = async () => {
    try {
      const res = await api.get('/bookings/my');
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
      setSuccess('✓ Booking confirmed!');
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
    <AppShell title="Booking">
      <form className="card" onSubmit={handleSubmit(onSubmit)}>
        <p className="section-title">New Booking</p>

        <label className="field-label">Date</label>
        <input
          type="date"
          className="field-input"
          min={todayISO()}
          {...register('date', { required: true })}
        />
        {dateVal && dateVal < todayISO() && (
          <p className="form-error">⚠ Past dates are not allowed</p>
        )}

        <label className="field-label">Location</label>
        <select className="field-select" {...register('location', { required: true })}>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <label className="field-label">Qty (kg)</label>
        <input
          type="number"
          className="field-input"
          min={1}
          max={9999}
          placeholder="Enter weight"
          {...register('quantityKg', {
            required: 'Quantity required',
            min: { value: 1, message: 'Min 1 kg' }
          })}
        />
        {errors.quantityKg && (
          <p className="form-error">{errors.quantityKg.message}</p>
        )}

        <label className="field-label">Notes</label>
        <textarea
          className="field-textarea"
          maxLength={200}
          placeholder="Optional..."
          {...register('notes')}
        />

        {apiError && <p className="form-error">{apiError}</p>}
        {success && <p className="form-success">{success}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Confirm Booking'}
        </button>
      </form>

      <p className="section-title">My Bookings</p>
      {loading ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <p className="empty-text">No bookings yet. Make your first booking above.</p>
      ) : (
        bookings.map((b) => (
          <div key={b._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>
                {formatDateShort(b.date)} · {b.location}
              </strong>
              <div style={{ fontSize: 12, color: '#888' }}>{b.quantityKg} kg</div>
            </div>
            <Badge status={b.status} />
          </div>
        ))
      )}
    </AppShell>
  );
}
