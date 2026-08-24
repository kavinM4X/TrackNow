import { useEffect, useState } from 'react';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { formatINR, todayISO } from '../../utils/format';
import styles from './Reports.module.css';

const REPORT_TABS = [
  { key: 'daily', label: '📊 Daily Report' },
  { key: 'monthly', label: '📅 Monthly' },
  { key: 'party', label: '🤝 Party' },
  { key: 'expense', label: '⛽ Expenses' }
];

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
    <AppShell title="Fleet Analytics & Reports">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Driver Fleet Analytics</h2>
            <p className={styles.headerSub}>Daily collections, vehicle bar charts & net expense summaries</p>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className={styles.tabsRow}>
          {REPORT_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'daily' && (
          <>
            {/* Date Picker Box */}
            <div className={styles.dateCard}>
              <label className={styles.dateLabel}>Select Report Date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="app-loading">
                <div className="spinner" />
              </div>
            ) : (
              <>
                {/* Vehicle Bar Chart Card */}
                <div className={styles.chartCard}>
                  <h3 className={styles.chartTitle}>
                    <span>📊</span> Vehicle-wise Daily Collections
                  </h3>

                  <div className={styles.chartBarContainer}>
                    {Object.entries(report?.byDriver || {}).length === 0 ? (
                      <p className={styles.emptyState} style={{ padding: '20px 0' }}>
                        No collections recorded on this date.
                      </p>
                    ) : (
                      Object.entries(report?.byDriver || {}).map(([name, val]) => (
                        <div key={name} className={styles.chartCol}>
                          <span className={styles.barValue}>{formatINR(val)}</span>
                          <div
                            className={styles.barFill}
                            style={{ height: `${Math.max(8, (val / maxBar) * 100)}%` }}
                          />
                          <span className={styles.barName}>{name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Financial Totals Summary Card */}
                <div className={styles.totalsCard}>
                  <div className={styles.totalRow}>
                    <span>Total Collected Cash</span>
                    <strong className={styles.valPos}>+{formatINR(report?.totalCollected)}</strong>
                  </div>

                  <div className={styles.totalRow}>
                    <span>Total Trip Expenses</span>
                    <strong className={styles.valNeg}>-{formatINR(report?.totalExpenses)}</strong>
                  </div>

                  <hr className={styles.divider} />

                  <div className={styles.netRow}>
                    <span>Net Fleet Profit</span>
                    <span className={styles.valPos}>{formatINR(report?.net)}</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab !== 'daily' && (
          <div className={styles.emptyState}>
            Monthly, party, and expense detailed reports are coming soon.
          </div>
        )}
      </div>
    </AppShell>
  );
}
