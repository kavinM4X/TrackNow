import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import dr from './Driver.module.css';

export default function Reports() {
  const [tab, setTab] = useState('daily');
  const [date, setDate] = useState(todayISO());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tab !== 'daily') {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(`/admin/driver/reports/daily?date=${date}`)
      .then((r) => setReport(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tab, date]);

  const maxBar = Math.max(...Object.values(report?.byDriver || { x: 1 }), 1);

  return (
    <AppShell title="Reports" driverSection>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
        {['daily', 'monthly', 'party', 'expense'].map((t) => (
          <button
            key={t}
            type="button"
            className={`${dr.filterChip} ${tab === t ? dr.filterChipOn : ''}`}
            onClick={() => setTab(t)}
            style={{ textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'daily' && (
        <>
          <input
            type="date"
            className="field-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {loading ? (
            <div className="spinner" />
          ) : (
            <>
              <div className="card">
                <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                  Vehicle-wise Collections
                </div>
                <div className={dr.chartBar}>
                  {Object.entries(report?.byDriver || {}).map(([name, val]) => (
                    <div key={name} className={dr.chartCol}>
                      <div style={{ fontSize: 9, color: '#888' }}>{formatINR(val)}</div>
                      <div
                        className={dr.chartFill}
                        style={{ height: `${Math.max(8, (val / maxBar) * 100)}%` }}
                      />
                      <div style={{ fontSize: 9, color: '#888' }}>{name}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Total Collected</span>
                  <span className={dr.pos}>{formatINR(report?.totalCollected)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>Total Expenses</span>
                  <span className={dr.neg}>{formatINR(report?.totalExpenses)}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>Net</strong>
                  <strong className={dr.pos}>{formatINR(report?.net)}</strong>
                </div>
              </div>
            </>
          )}
        </>
      )}
      {tab !== 'daily' && (
        <p className="empty-text">Monthly, party, and expense reports — coming soon.</p>
      )}
    </AppShell>
  );
}
