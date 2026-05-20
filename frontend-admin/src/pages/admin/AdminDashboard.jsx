import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { clearSession } from '../../api/client';
import { formatDateDayMonth } from '../../utils/format';

function ensure12Months(data = []) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const base = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    base.push({ month: monthNames[d.getMonth()], doneDays: 0 });
  }
  if (!Array.isArray(data) || data.length === 0) return base;

  const byMonth = new Map();
  data.forEach((item) => {
    if (!item?.month) return;
    byMonth.set(item.month, Number(item.doneDays) || 0);
  });
  return base.map((m) => ({ ...m, doneDays: byMonth.get(m.month) ?? 0 }));
}

function BarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.doneDays), 1);
  const barW = 20;
  const gap = 8;
  const leftPad = 8;
  const rightPad = 8;
  const w = leftPad + rightPad + data.length * barW + (data.length - 1) * gap;
  const h = 100;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: 'block', minWidth: '100%' }}>
        <line x1={0} y1={h - 20} x2={w} y2={h - 20} stroke="#d9e2ec" strokeWidth="1" />
        {data.map((d, i) => {
          const scaled = (d.doneDays / max) * 56;
          const barH = d.doneDays > 0 ? Math.max(6, scaled) : 4;
          const x = leftPad + i * (barW + gap);
          return (
            <g key={`${d.month}-${i}`}>
              <rect
                x={x}
                y={h - 20 - barH}
                width={barW}
                height={barH}
                fill="#1e4d7b"
                rx={3}
                opacity={i === data.length - 1 ? 0.35 : 1}
              />
              <text x={x + barW / 2} y={h - 4} textAnchor="middle" fontSize="8" fill="#9aa5b1">
                {d.month}
              </text>
              <text x={x + barW / 2} y={h - 24 - barH} textAnchor="middle" fontSize="8" fill="#1e4d7b">
                {d.doneDays}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/batch-chart'),
      api.get('/admin/recent-bookings')
    ])
      .then(([s, c, b]) => {
        setStats(s.data);
        setChart(ensure12Months(c.data));
        setBookings(b.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const today = formatDateDayMonth(new Date().toISOString().split('T')[0]);

  const logout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    clearSession();
    onLogout?.();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AppShell title="Admin Dashboard" headerRight={<span style={{ fontSize: 12, opacity: 0.8 }}>{today}</span>}>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--blue)' }}>
                {stats?.totalUsers ?? 0}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Users</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#856404' }}>
                {stats?.pendingBookings ?? 0}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Pending</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--green)' }}>
                {stats?.activeUsers ?? 0}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Active</div>
            </div>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600 }}>—</div>
              <div style={{ fontSize: 11, color: '#888' }}>Revenue</div>
            </div>
          </div>

          <div className="card">
            <p className="section-title">Monthly Done Days (12 months)</p>
            <BarChart data={chart} />
          </div>

          <p className="section-title">Recent Bookings</p>
          {bookings.map((b) => (
            <div
              key={b._id}
              className="card"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <strong>{b.userName || b.userId?.name}</strong>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {formatDateDayMonth(b.date)} · {b.location?.slice(0, 3)} · {b.quantityKg}kg
                </div>
              </div>
              <span className={`badge badge-${b.status === 'pending' ? 'amber' : 'green'}`}>
                {b.status}
              </span>
            </div>
          ))}

          <button type="button" className="btn-danger" onClick={logout} style={{ marginTop: 8 }}>
            Logout
          </button>
        </>
      )}
    </AppShell>
  );
}
