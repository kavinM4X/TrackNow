import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

export default function HistoryTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/driver/history')
      .then((r) => setTrips(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load trip history'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DriverShell title="History">
      {loading ? (
        <div className="spinner" />
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : trips.length === 0 ? (
        <div className="card">
          <strong>No trip history yet</strong>
          <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
            Trips appear here after admin assigns a vehicle.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
            Tap a trip to view expenses ({trips.length} trip{trips.length > 1 ? 's' : ''})
          </p>
          {trips.map((t) => (
            <button
              key={t._id}
              type="button"
              className={styles.expenseTripCard}
              onClick={() => navigate(`/history/${t._id}`)}
            >
              <div className={styles.expenseVehicleDate}>
                {t.tripDate ? formatDateDayMonth(t.tripDate) : '—'}
              </div>
              <div className={styles.expenseVehicleHead}>
                <div style={{ textAlign: 'left' }}>
                  <strong className={styles.expenseVehicleNum}>{t.vehicleNumber}</strong>
                  <div className={styles.expenseVehicleMeta}>
                    {t.city || '—'} · {t.status}
                    {t.expenseCount ? ` · ${t.expenseCount} expense${t.expenseCount > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
                <div className={styles.expenseVehicleBal}>
                  <div className={`${styles.expenseVehicleBalVal} ${styles.neg}`}>
                    {formatINR(t.expenseTotal)}
                  </div>
                  <div className={styles.expenseVehicleBalLbl}>Total spent</div>
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </DriverShell>
  );
}
