import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import {
  defaultHistoryDateRange,
  formatDateShort,
  formatINR,
  initials,
  MARKETS,
  shortUserId
} from '../../utils/format';
import styles from './AllBatchHistory.module.css';

export default function AllBatchHistory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalBatches: 0, totalGoodSilkKg: 0, totalEstimatedValue: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    location: 'all',
    ...defaultHistoryDateRange()
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/batches/history', { params: filters });
      setRows(res.data.rows || []);
      setSummary(res.data.summary || { totalBatches: 0, totalGoodSilkKg: 0, totalEstimatedValue: 0 });
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.userId, filters.location, filters.fromDate, filters.toDate]);

  const selectedUser = useMemo(
    () => users.find((u) => u._id === filters.userId),
    [users, filters.userId]
  );

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/batches/history', {
        params: { ...filters, export: 'csv' },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all-batch-history.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export error:', e);
    }
  };

  return (
    <AppShell title="All Batch History">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Silk Harvest Batch History</h2>
            <p className={styles.headerSub}>View and filter historical cocoon records across all farmers</p>
          </div>
          <button type="button" className={styles.exportBtn} onClick={exportCsv}>
            <span>📥</span> Export Excel
          </button>
        </div>

        {/* Filter Card */}
        <div className={styles.filterCard}>
          <input
            className={styles.searchInput}
            placeholder="🔍 Search farmer, market, date..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <div className={styles.filterGrid}>
            <select
              className={styles.filterSelect}
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
            >
              <option value="">👤 All Farmers</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({shortUserId(u._id)})
                </option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={filters.location}
              onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
            >
              <option value="all">📍 All Markets</option>
              {MARKETS.map((m) => (
                <option key={m.label} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              className={styles.filterDate}
              value={filters.fromDate}
              onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
            />

            <input
              type="date"
              className={styles.filterDate}
              value={filters.toDate}
              onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={`${styles.summaryVal} ${styles.summaryValBlue}`}>
              {summary.totalBatches || 0}
            </span>
            <span className={styles.summaryLbl}>📦 Batches</span>
          </div>

          <div className={styles.summaryCard}>
            <span className={`${styles.summaryVal} ${styles.summaryValGreen}`}>
              {Math.round(summary.totalGoodSilkKg || 0)} <small style={{ fontSize: 10, fontWeight: 500 }}>kg</small>
            </span>
            <span className={styles.summaryLbl}>🌾 Good Silk</span>
          </div>

          <div className={styles.summaryCard}>
            <span className={`${styles.summaryVal} ${styles.summaryValBlue}`}>
              {formatINR(summary.totalEstimatedValue || 0)}
            </span>
            <span className={styles.summaryLbl}>💰 Est. Value</span>
          </div>
        </div>

        {/* Batch Feed */}
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}>
            No batch history entries found for the selected filters.
          </div>
        ) : (
          <div className={styles.batchFeed}>
            {rows.map((r) => (
              <div
                key={r._id}
                className={styles.batchCard}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/batch-history/user/${r.userId}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/batch-history/user/${r.userId}`)}
              >
                <div className={styles.batchHeader}>
                  <div className={styles.userInfoGroup}>
                    <div className={styles.userAvatar}>
                      {initials(r.userName)}
                    </div>
                    <div className={styles.userTextMeta}>
                      <h4 className={styles.userName}>{r.userName}</h4>
                      <span className={styles.batchSubMeta}>
                        🗓️ {formatDateShort(r.date)} · 📍 {r.location}
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-green">Done</span>
                </div>

                <div className={styles.metricGrid}>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Good kg</span>
                    <span className={styles.metricVal} style={{ color: 'var(--green, #2e7d52)' }}>
                      {r.goodSilkKg}
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Waste kg</span>
                    <span className={styles.metricVal} style={{ color: '#d97706' }}>
                      {r.wasteKg}
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Doubles</span>
                    <span className={styles.metricVal} style={{ color: '#a0522d' }}>
                      {r.doublesKg}
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Value</span>
                    <span className={styles.metricVal} style={{ color: 'var(--blue, #1e4d7b)' }}>
                      {formatINR(r.estimatedValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
