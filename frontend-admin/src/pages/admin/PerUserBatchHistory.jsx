import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api from '../../api/client';
import { defaultHistoryDateRange, formatDateShort, formatINR, shortUserId } from '../../utils/format';
import styles from './PerUserBatchHistory.module.css';

function initials(name) {
  if (!name) return 'F';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function PerUserBatchHistory() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalBatches: 0,
    totalGoodSilkKg: 0,
    totalWasteKg: 0,
    totalEstimatedValue: 0
  });
  const [userName, setUserName] = useState('Farmer Account');
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    ...defaultHistoryDateRange(),
    location: 'all',
    search: ''
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/batches/history', {
        params: { ...filters, userId }
      });
      setRows(res.data.rows || []);
      setSummary(res.data.summary || { totalBatches: 0, totalGoodSilkKg: 0, totalWasteKg: 0, totalEstimatedValue: 0 });
      const first = (res.data.rows || [])[0];
      if (first?.userName) setUserName(first.userName);
      else {
        const userRes = await api.get(`/admin/users/${userId}`);
        setUserName(userRes.data?.user?.name || 'Farmer Account');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filters.fromDate, filters.toDate, filters.location, filters.search]);

  const exportCsv = async () => {
    try {
      const res = await api.get('/admin/batches/history', {
        params: { ...filters, userId, export: 'csv' },
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${userName.replace(/\s+/g, '-').toLowerCase()}-batch-history.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export CSV error:', e);
    }
  };

  return (
    <AppShell title={`${userName} — Batch Statement`} backPath="/admin/batch-history">
      <div className={styles.container}>
        {/* User Profile Hero Card */}
        <div className={styles.userHeroCard}>
          <div className={styles.userProfileLeft}>
            <div className={styles.avatarRing}>{initials(userName)}</div>
            <div className={styles.userMetaHead}>
              <h2 className={styles.userNameTitle}>{userName}</h2>
              <span className={styles.userIdChip}>
                Farmer ID: <strong>{shortUserId(userId)}</strong>
              </span>
            </div>
          </div>

          <button type="button" className={styles.exportBtn} onClick={exportCsv}>
            <span>📥</span> Export CSV Statement
          </button>
        </div>

        {/* Analytics Key Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLbl}>📦 Total Batches</span>
            <span className={`${styles.statVal} ${styles.statValBlue}`}>
              {summary.totalBatches || 0}
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLbl}>🌾 Good Silk</span>
            <span className={`${styles.statVal} ${styles.statValGreen}`}>
              {Math.round(summary.totalGoodSilkKg || 0)} <small style={{ fontSize: 12, fontWeight: 500 }}>kg</small>
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLbl}>🍂 Waste Silk</span>
            <span className={`${styles.statVal} ${styles.statValAmber}`}>
              {Math.round(summary.totalWasteKg || 0)} <small style={{ fontSize: 12, fontWeight: 500 }}>kg</small>
            </span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLbl}>💰 Total Value</span>
            <span className={`${styles.statVal} ${styles.statValGreen}`}>
              {formatINR(summary.totalEstimatedValue || 0)}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className={styles.filterCard}>
          <input
            type="date"
            className={styles.filterInput}
            value={filters.fromDate}
            onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          />
          <input
            type="date"
            className={styles.filterInput}
            value={filters.toDate}
            onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          />
          <select
            className={styles.filterSelect}
            value={filters.location}
            onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
          >
            <option value="all">All Markets</option>
            <option value="Coimbatore">Coimbatore</option>
            <option value="Mamballi">Mamballi</option>
            <option value="Ramnagar">Ramnagar</option>
            <option value="Dharmapuri">Dharmapuri</option>
          </select>
          <input
            className={`${styles.filterInput} ${styles.searchInput}`}
            placeholder="🔍 Search date, market..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
        </div>

        {/* Batch History List */}
        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : rows.length === 0 ? (
          <div className={styles.emptyState}>
            No harvest batch entries found for this farmer in the selected date range.
          </div>
        ) : (
          <div className={styles.batchFeed}>
            {rows.map((r) => (
              <div key={r._id} className={styles.batchCard}>
                <div className={styles.batchHeader}>
                  <div className={styles.batchTitle}>
                    <span className={styles.dateBadge}>🗓️ {formatDateShort(r.date)}</span>
                    <span className={styles.locPill}>📍 {r.location}</span>
                  </div>
                  <span className="badge badge-green">✓ Verified</span>
                </div>

                <div className={styles.metricGrid}>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Good Silk</span>
                    <span className={styles.metricVal} style={{ color: 'var(--green, #2e7d52)' }}>
                      {r.goodSilkKg} kg
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Waste Silk</span>
                    <span className={styles.metricVal} style={{ color: '#d97706' }}>
                      {r.wasteKg || 0} kg
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Doubles</span>
                    <span className={styles.metricVal} style={{ color: '#a0522d' }}>
                      {r.doublesKg || 0} kg
                    </span>
                  </div>
                  <div className={styles.metricBox}>
                    <span className={styles.metricLbl}>Net Payout</span>
                    <span className={styles.metricVal} style={{ color: 'var(--green, #2e7d52)', fontWeight: 800 }}>
                      {formatINR(r.estimatedValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate('/admin/batch-history')}
        >
          ← Back to All Batch History
        </button>
      </div>
    </AppShell>
  );
}
