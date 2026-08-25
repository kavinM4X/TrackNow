import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import { deduplicatedGet } from '../api/client';
import { formatINR, formatDateDayMonth, todayISO } from '../utils/format';
import styles from './History.module.css';

export default function HistoryTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const r = await deduplicatedGet('/driver/vehicles', {}, 15_000);
        const list = Array.isArray(r.data)
          ? r.data
          : r.data?.vehicles || (r.data?.vehicle ? [r.data.vehicle] : []);
        
        if (list.length > 0) {
          setTrips(
            list.map((v) => ({
              _id: v._id,
              vehicleNumber: v.vehicleNumber,
              city: v.city,
              status: v.status || 'active',
              expenseTotal: v.expenseTotal || 0,
              expenseCount: v.expenseCount || 0,
              tripDate: v.tripDate || todayISO()
            }))
          );
        } else {
          const hist = await deduplicatedGet('/driver/history', {}, 15_000);
          setTrips(hist.data || []);
        }
      } catch (err) {
        try {
          const hist = await deduplicatedGet('/driver/history', {}, 15_000);
          setTrips(hist.data || []);
        } catch {
          setError('Could not load trip history');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <DriverShell title="Trip History">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : error && trips.length === 0 ? (
          <p className="form-error">{error}</p>
        ) : trips.length === 0 ? (
          <div className={styles.emptyCard}>
            <strong>No Trip History Recorded Yet</strong>
            <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
              Historical trips and expenses will automatically appear here once vehicle trips are logged.
            </p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
              Tap a trip to view expense details ({trips.length} trip{trips.length > 1 ? 's' : ''})
            </div>

            <div className={styles.container} style={{ gap: 10 }}>
              {trips.map((t) => (
                <button
                  key={t._id}
                  type="button"
                  className={styles.historyTripCard}
                  onClick={() => navigate(`/history/${t._id}`)}
                >
                  <div className={styles.tripHeader}>
                    <span className={styles.vehicleBadge}>
                      🚚 {t.vehicleNumber}
                    </span>
                    <span className={styles.datePill}>
                      🗓️ {t.tripDate ? formatDateDayMonth(t.tripDate) : 'Recent'}
                    </span>
                  </div>

                  <div className={styles.tripBody}>
                    <div className={styles.tripMeta}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                        📍 {t.city || 'Market Center'}
                      </span>
                      <span className={styles.tripMetaSub}>
                        Status: {t.status}
                        {t.expenseCount ? ` · ${t.expenseCount} expense${t.expenseCount > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>

                    <div>
                      <div className={styles.spentVal}>− {formatINR(t.expenseTotal)}</div>
                      <div className={styles.spentLbl}>Total Spent</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </DriverShell>
  );
}
