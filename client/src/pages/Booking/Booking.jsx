import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createBooking, getMyBookings } from '../../api/booking.api';
import './Booking.css';

const LOCATIONS = ['Ramanagara', 'Mamballi', 'Dharmapuri', 'Coimbatore'];

const isDateInPast = (dateString) => {
  const selectedDate = new Date(dateString);
  selectedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate < today;
};

const Booking = () => {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('Ramanagara');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  const loadBookings = async () => {
    setBookingsLoading(true);
    try {
      const data = await getMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const validate = () => {
    const errors = {};

    if (!date) {
      errors.date = 'Booking date is required';
    } else if (isDateInPast(date)) {
      errors.date = 'Cannot select a past date';
    }

    if (!location) {
      errors.location = 'Please select a location';
    }

    if (!weight) {
      errors.weight = 'Weight is required';
    } else if (parseFloat(weight) <= 0) {
      errors.weight = 'Weight must be a positive number';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createBooking({
        date,
        location,
        weight: parseFloat(weight),
      });

      setSuccess(true);
      setDate('');
      setWeight('');
      setLocation('Ramanagara');
      setFieldErrors({});
      await loadBookings();

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return '#FCD34D';
      case 'Confirmed':
        return '#3B82F6';
      case 'Completed':
        return '#10B981';
      default:
        return '#9CA99F';
    }
  };

  return (
    <div className="booking-page">
      <div className="page-header">
        <h1>New Booking</h1>
      </div>

      <div className="booking-form-card">
        <form onSubmit={handleSubmit}>
          {/* Date Field */}
          <div className="form-group">
            <label htmlFor="booking-date" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1A2E1A' }}>
              Booking Date
            </label>
            <input
              id="booking-date"
              type="date"
              min={getTodayDate()}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, date: '' }));
              }}
              className={`form-input ${fieldErrors.date ? 'error' : ''}`}
            />
            {fieldErrors.date && (
              <p className="field-error">{fieldErrors.date}</p>
            )}
          </div>

          {/* Location Field */}
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#1A2E1A' }}>
              Location
            </label>
            <div className="location-buttons">
              {LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`location-btn ${location === loc ? 'selected' : ''}`}
                  onClick={() => {
                    setLocation(loc);
                    setFieldErrors((prev) => ({ ...prev, location: '' }));
                  }}
                >
                  {loc}
                </button>
              ))}
            </div>
            {fieldErrors.location && (
              <p className="field-error">{fieldErrors.location}</p>
            )}
          </div>

          {/* Weight Field */}
          <div className="form-group">
            <label htmlFor="booking-weight" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#1A2E1A' }}>
              Weight (kg)
            </label>
            <input
              id="booking-weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setFieldErrors((prev) => ({ ...prev, weight: '' }));
              }}
              placeholder="Enter weight in kg"
              className={`form-input ${fieldErrors.weight ? 'error' : ''}`}
            />
            {fieldErrors.weight && (
              <p className="field-error">{fieldErrors.weight}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="booking-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <div style={{ width: '20px', height: '20px', border: '2.5px solid rgba(255, 255, 255, 0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div>
            ) : (
              'Create Booking'
            )}
          </button>

          {/* Success Message */}
          {success && (
            <div className="booking-success-msg">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M16.5 5.5L8.5 13.5L3.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Booking confirmed successfully</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Booking History */}
      <div className="booking-history">
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1A2E1A', marginBottom: '16px' }}>
          Your Bookings
        </h2>

        {bookingsLoading ? (
          <div>
            {[1, 2, 3].map((idx) => (
              <div key={idx} style={{ background: 'white', borderRadius: '12px', padding: '16px', marginBottom: '10px', height: '60px', background: '#F7F9F7', animation: 'skeletonPulse 1.5s ease-in-out infinite' }}></div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 24px', background: 'white', borderRadius: '16px', border: '1px dashed #E0EBE0' }}>
            <p style={{ fontSize: '14px', color: '#9CA99F', margin: '0' }}>
              No bookings yet. Create your first booking above.
            </p>
          </div>
        ) : (
          <div>
            {bookings.map((booking, idx) => (
              <div key={idx} className="booking-history-item" style={{ animationDelay: `${idx * 0.08}s` }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#1A2E1A', margin: '0 0 4px' }}>
                    {new Date(booking.date).toLocaleDateString('en-IN')}
                  </p>
                  <p style={{ fontSize: '13px', color: '#9CA99F', margin: 0 }}>
                    {booking.location} • {booking.weight} kg
                  </p>
                </div>
                <div
                  style={{
                    background: getStatusColor(booking.status),
                    color: booking.status === 'Pending' ? '#1A2E1A' : 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                  }}
                >
                  {booking.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
