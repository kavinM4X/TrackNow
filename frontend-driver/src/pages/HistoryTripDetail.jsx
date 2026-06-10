import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

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
    <DriverShell title="Trip Expenses" backPath="/history">
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              {data?.tripDate ? formatDateDayMonth(data.tripDate) : '—'}
            </div>
            <strong style={{ fontSize: 18 }}>{vehicle?.vehicleNumber}</strong>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {vehicle?.city} · {vehicle?.status}
            </div>
            <div className={styles.advanceRow}>
              <span className={styles.advanceLbl}>Advance</span>
              <span className={styles.advanceVal}>+{formatINR(vehicle?.advanceTotal)}</span>
            </div>
            <div className={styles.advanceRow} style={{ borderTop: 'none', marginTop: 6, paddingTop: 0 }}>
              <span className={styles.advanceLbl}>Total expenses</span>
              <span className={styles.neg} style={{ fontWeight: 600 }}>
                -{formatINR(vehicle?.expenseTotal)}
              </span>
            </div>
            <div className={styles.advanceRow} style={{ borderTop: 'none', marginTop: 6, paddingTop: 0 }}>
              <span className={styles.advanceLbl}>Balance</span>
              <span className={styles.pos} style={{ fontWeight: 600 }}>
                {formatINR(vehicle?.balance)}
              </span>
            </div>
          </div>

          <p className="section-title">Expenses ({expenses.length})</p>
          {expenses.length === 0 ? (
            <p style={{ fontSize: 12, color: '#888' }}>No expenses recorded for this trip.</p>
          ) : (
            expenses.map((e) => (
              <div key={e._id} className={styles.savedExpenseLine}>
                <div>
                  <strong style={{ textTransform: 'capitalize' }}>{e.category}</strong>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {formatDateDayMonth(e.date)}
                    {e.remarks ? ` · ${e.remarks}` : ''}
                  </div>
                </div>
                <span className={styles.neg}>-{formatINR(e.amount)}</span>
              </div>
            ))
          )}
        </>
      )}
    </DriverShell>
  );
}
