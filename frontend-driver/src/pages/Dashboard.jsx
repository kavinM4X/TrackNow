import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DriverShell from '../components/layout/DriverShell';
import api from '../api/client';
import { formatINR, formatDateDayMonth } from '../utils/format';
import styles from '../components/layout/DriverShell.module.css';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    api
      .get('/driver/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setApiError('Driver API not available. Redeploy the backend to Vercel.');
        } else {
          setApiError(err.response?.data?.error || 'Could not load dashboard');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const vehicle = data?.vehicle;

  return (
    <DriverShell title="Driver Dashboard">
      {loading ? (
        <div className="spinner" />
      ) : apiError ? (
        <p className="form-error">{apiError}</p>
      ) : data?.noVehicle ? (
        <div className="card">
          <strong>No vehicle assigned</strong>
          <p style={{ fontSize: 13, color: '#888', margin: '8px 0 0' }}>
            Ask admin to add your vehicle under Admin → Driver → Vehicles and select your name.
          </p>
        </div>
      ) : (
        <>
          <div className="card" style={{ background: 'var(--amber)', color: '#fff', border: 'none' }}>
            <div style={{ fontSize: 12, opacity: 0.9 }}>{vehicle?.vehicleNumber}</div>
            <div style={{ fontSize: 22, fontWeight: 600, margin: '4px 0' }}>
              {formatINR(vehicle?.balance)}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Vehicle Balance</div>
            <div className={styles.heroActions} style={{ marginTop: 12, marginBottom: 0 }}>
              <Link to="/expense" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
                + Record Expense
              </Link>
              <Link to="/silk" className={`${styles.heroBtn} ${styles.heroBtnSecondary}`}>
                + Silk Entry
              </Link>
            </div>
          </div>

          <div className={styles.statGrid}>
            <div className="card" style={{ margin: 0 }}>
              <div className={`${styles.statVal} ${styles.pos}`}>{formatINR(vehicle?.advanceTotal)}</div>
              <div className={styles.statLbl}>Advance</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className={`${styles.statVal} ${styles.neg}`}>{formatINR(data?.todaySpent)}</div>
              <div className={styles.statLbl}>Today Spent</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className={`${styles.statVal} ${styles.neg}`}>{formatINR(vehicle?.expenseTotal)}</div>
              <div className={styles.statLbl}>Total Expense</div>
            </div>
            <div className="card" style={{ margin: 0 }}>
              <div className={styles.statVal} style={{ color: '#856404' }}>
                {data?.pendingCount ?? 0}
              </div>
              <div className={styles.statLbl}>Pending Entries</div>
            </div>
          </div>

          <p className="section-title">Recent Expenses</p>
          {(data?.recentExpenses || []).length === 0 ? (
            <p style={{ fontSize: 12, color: '#888' }}>No expenses yet.</p>
          ) : (
            data.recentExpenses.map((e) => (
              <div key={e._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ textTransform: 'capitalize' }}>{e.category}</strong>
                  <span className={styles.neg}>-{formatINR(e.amount)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {formatDateDayMonth(e.date)}
                  {e.remarks ? ` · ${e.remarks}` : ''}
                </div>
              </div>
            ))
          )}

          <p className="section-title">Recent Silk Entries</p>
          {(data?.recentEntries || []).length === 0 ? (
            <p style={{ fontSize: 12, color: '#888' }}>No silk entries yet.</p>
          ) : (
            data.recentEntries.map((e) => (
              <div key={e._id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{e.partyId?.name || 'Party'}</strong>
                  <span className="badge badge-pending">{e.status}</span>
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {formatDateDayMonth(e.date)} · Good {e.goodKg}kg, Waste {e.wasteKg}kg
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{formatINR(e.totalAmount)}</div>
              </div>
            ))
          )}
        </>
      )}
    </DriverShell>
  );
}
