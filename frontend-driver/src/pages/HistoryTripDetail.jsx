import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from './History.module.css';

function categoryIcon(cat) {
  const c = (cat || '').toLowerCase();
  if (c.includes('fuel') || c.includes('diesel') || c.includes('petrol')) return '⛽';
  if (c.includes('food') || c.includes('tiffin') || c.includes('tea')) return '🍲';
  if (c.includes('toll')) return '🛣️';
  if (c.includes('repair') || c.includes('maint')) return '🔧';
  if (c.includes('unloading') || c.includes('load')) return '📦';
  return '💸';
}

export default function HistoryTripDetail() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/driver/history/${vehicleId}`)
      .then((r) => setData(r.data))
      .catch(() => navigate('/history', { replace: true }))
      .finally(() => setLoading(false));
  }, [vehicleId, navigate]);

  const vehicle = data?.vehicle;
  const expenses = data?.expenses || [];

  return (
    <DriverShell title="Trip Expense Log" backPath="/history">
      <div className={styles.container}>
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Trip Hero Header */}
            <div className={styles.detailHeroCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 18, fontWeight: 800 }}>🚚 {vehicle?.vehicleNumber}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>
                  🗓️ {data?.tripDate ? formatDateDayMonth(data.tripDate) : 'Recent'}
                </span>
              </div>

              <div style={{ fontSize: 13, opacity: 0.9 }}>
                📍 {vehicle?.city || 'Market Center'} · Status: {vehicle?.status}
              </div>

              <div className={styles.heroRowGrid}>
                <div className={styles.heroBox}>
                  <span className={styles.heroBoxLbl}>Advance</span>
                  <span className={styles.heroBoxVal} style={{ color: '#10b981' }}>
                    +{formatINR(vehicle?.advanceTotal)}
                  </span>
                </div>

                <div className={styles.heroBox}>
                  <span className={styles.heroBoxLbl}>Total Spent</span>
                  <span className={styles.heroBoxVal} style={{ color: '#fca5a5' }}>
                    −{formatINR(vehicle?.expenseTotal)}
                  </span>
                </div>

                <div className={styles.heroBox}>
                  <span className={styles.heroBoxLbl}>Balance</span>
                  <span className={styles.heroBoxVal} style={{ color: '#ffffff' }}>
                    {formatINR(vehicle?.balance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expense Log List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                📝 Recorded Expenses ({expenses.length})
              </div>

              {expenses.length === 0 ? (
                <div className={styles.emptyCard}>No expenses recorded for this trip.</div>
              ) : (
                <div className={styles.expenseList}>
                  {expenses.map((e) => (
                    <div key={e._id} className={styles.expenseCard}>
                      <div className={styles.expenseLeft}>
                        <div className={styles.catIconBox}>{categoryIcon(e.category)}</div>
                        <div className={styles.expenseMeta}>
                          <span className={styles.catTitle}>{e.category}</span>
                          <span className={styles.expenseSub}>
                            🗓️ {formatDateDayMonth(e.date)}
                            {e.remarks ? ` · ${e.remarks}` : ''}
                          </span>
                        </div>
                      </div>

                      <span className={styles.expenseVal}>
                        − {formatINR(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DriverShell>
  );
}
