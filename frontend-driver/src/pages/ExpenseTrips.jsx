import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api, { getStoredUser } from '../api/client';
import { formatINR, todayISO, formatDateDayMonth } from '../utils/format';
import styles from './Expense.module.css';

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
        /* older backend fallback */
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
    <DriverShell title="Select Trip Expense">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : error && vehicles.length === 0 ? (
          <p className="form-error">{error}</p>
        ) : vehicles.length === 0 ? (
          <div className={styles.stagedCard} style={{ background: '#ffffff', borderColor: '#e0e0dc' }}>
            <h4 style={{ margin: 0, color: '#1e293b' }}>No Assigned Trip Available</h4>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              Ask your logistics admin to assign a vehicle trip under Driver → Vehicles for ({driverName || 'your driver account'}).
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Select a trip to record vehicle expenses ({vehicles.length} assigned)
            </div>

            {vehicles.map((v) => {
              const tripId = String(v._id).slice(-6).toUpperCase();
              return (
                <button
                  key={v._id}
                  type="button"
                  className={styles.tripSelectCard}
                  onClick={() => navigate(`/expense/${v._id}`)}
                >
                  <div className={styles.tripHeader}>
                    <span className={styles.vehicleBadge}>
                      🚚 {v.vehicleNumber}
                    </span>
                    <span className={styles.tripIdPill}>
                      TRIP #{tripId}
                    </span>
                  </div>

                  <div className={styles.tripBody}>
                    <div className={styles.tripMeta}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        🗓️ {todayLabel} · {v.tripLeg === 'come' ? 'Return Leg' : 'Outbound Leg'}
                      </span>
                      <span className={styles.tripMetaSub}>
                        Driver: {v.driverName || driverName} {v.city ? `· ${v.city}` : ''}
                      </span>
                    </div>

                    <div>
                      <div className={styles.cashVal}>{formatINR(v.balance)}</div>
                      <div className={styles.cashLbl}>Cash Balance</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </DriverShell>
  );
}
