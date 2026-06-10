import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR } from '../../utils/format';
import dr from './Driver.module.css';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/admin/driver/stats'), api.get('/admin/driver/vehicles')])
      .then(([s, v]) => {
        setStats(s.data);
        setVehicles(v.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Driver Dashboard" driverSection>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className={dr.statGrid}>
            <div className={`card ${dr.statCard}`}>
              <div className={`${dr.statVal} ${dr.pos}`}>{formatINR(stats?.totalCash)}</div>
              <div className={dr.statLbl}>Total Vehicle Cash</div>
            </div>
            <div className={`card ${dr.statCard}`}>
              <div className={`${dr.statVal} ${dr.bal}`}>{formatINR(stats?.totalAdvance)}</div>
              <div className={dr.statLbl}>Advance Given</div>
            </div>
            <div className={`card ${dr.statCard}`}>
              <div className={`${dr.statVal} ${dr.neg}`}>{formatINR(stats?.totalExpense)}</div>
              <div className={dr.statLbl}>Total Expenses</div>
            </div>
            <div
              className={`card ${dr.statCard}`}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/admin/driver/entries')}
            >
              <div className={dr.statVal} style={{ color: '#856404' }}>
                {stats?.pendingEntries ?? 0}
              </div>
              <div className={dr.statLbl}>Pending Entries</div>
            </div>
          </div>

          <p className="section-title">Vehicle Summary</p>
          {vehicles.map((v) => (
            <div
              key={v._id}
              className={`card ${dr.vehicleCard} ${dr.vehicleCardClick}`}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/admin/driver/vehicles/${v._id}/expenses`)}
              onKeyDown={(e) =>
                e.key === 'Enter' && navigate(`/admin/driver/vehicles/${v._id}/expenses`)
              }
            >
              <div className={dr.vehicleHead}>
                <div>
                  <strong>{v.vehicleNumber}</strong>
                  <div style={{ fontSize: 11, color: '#888' }}>Driver: {v.driverName}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={`${dr.statVal} ${dr.pos}`} style={{ fontSize: 16 }}>
                    {formatINR(v.balance)}
                  </div>
                  <div style={{ fontSize: 10, color: '#888' }}>Balance</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                Adv: {formatINR(v.advanceTotal)} ·{' '}
                <span className={dr.neg}>Exp: -{formatINR(v.expenseTotal)}</span>
              </div>
            </div>
          ))}
          {stats?.pendingEntries > 0 && (
            <p style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
              {stats.pendingEntries} pending entries ·{' '}
              <button type="button" className="topLink" onClick={() => navigate('/admin/driver/entries')}>
                Tap to review
              </button>
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}
