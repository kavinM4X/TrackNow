import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api, { getStoredUser } from '../api/client';
import { formatINR, todayISO, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

function pickVehicleList(...candidates) {
  let best = [];
  for (const c of candidates) {
    const list = Array.isArray(c) ? c : c?.vehicles?.length ? c.vehicles : c?.vehicle ? [c.vehicle] : [];
    if (list.length > best.length) best = list;
  }
  const seen = new Set();
  return best.filter((v) => {
    const id = String(v._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function ExpenseTrips() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const driverName = getStoredUser()?.name || '';

  useEffect(() => {
    const load = async () => {
      const results = [];
      try {
        const r = await api.get('/driver/vehicles');
        results.push(r.data);
      } catch {
        /* older backend may not have this route yet */
      }
      try {
        const r = await api.get('/driver/me');
        results.push(r.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load trips');
      }
      try {
        const r = await api.get('/driver/dashboard');
        results.push(r.data);
      } catch {
        /* optional fallback */
      }
      setVehicles(pickVehicleList(...results));
      setLoading(false);
    };
    load();
  }, []);

  const todayLabel = formatDateDayMonth(todayISO());

  return (
    <DriverShell title="Expense">
      {loading ? (
        <div className="spinner" />
      ) : error && vehicles.length === 0 ? (
        <p className="form-error">{error}</p>
      ) : vehicles.length === 0 ? (
        <div className="card">
          <strong>No trips assigned</strong>
          <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
            Ask admin to assign a trip under <strong>Driver → Vehicles</strong> and select your name
            ({driverName || 'your driver account'}) in the Driver Name dropdown.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>
            Select a trip to record expenses ({vehicles.length} trip{vehicles.length > 1 ? 's' : ''})
          </p>
          {vehicles.map((v) => {
            const tripId = String(v._id).slice(-8).toUpperCase();
            return (
            <button
              key={v._id}
              type="button"
              className={styles.expenseTripCard}
              onClick={() => navigate(`/expense/${v._id}`)}
            >
              <div className={styles.expenseVehicleDate}>
                Trip · {tripId} · {todayLabel}
              </div>
              <div className={styles.expenseVehicleHead}>
                <div style={{ textAlign: 'left' }}>
                  <strong className={styles.expenseVehicleNum}>{v.vehicleNumber}</strong>
                  <div className={styles.expenseVehicleMeta}>
                    {v.tripLeg === 'come' ? 'Come' : 'Go'} · Driver: {v.driverName || driverName} · {v.status}
                    {v.city ? ` · ${v.city}` : ''}
                  </div>
                </div>
                <div className={styles.expenseVehicleBal}>
                  <div className={styles.expenseVehicleBalVal}>{formatINR(v.balance)}</div>
                  <div className={styles.expenseVehicleBalLbl}>Available Cash</div>
                </div>
              </div>
            </button>
            );
          })}
        </>
      )}
    </DriverShell>
  );
}
