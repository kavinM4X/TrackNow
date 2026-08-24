import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import { deduplicatedGet } from '../../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../../utils/format';
import styles from './BatchHistory.module.css';

export default function BatchHistory() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState([]);
  const [totalKg, setTotalKg] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    deduplicatedGet('/batches/my', {}, 15_000)
      .then((res) => {
        setBatches(res.data.batches || []);
        setTotalKg(res.data.totalKg || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = batches.filter((b) =>
    formatDateDayMonth(b.date).toLowerCase().includes(search.toLowerCase()) ||
    (b.location && b.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AppShell title="Batch History" subtitle="View silk cocoon harvest records & payout breakdowns">
      <div className={styles.container}>
        {/* Hero Banner */}
        <div className={styles.heroBanner}>
          <div>
            <h2 className={styles.heroTitle}>📦 My Silk Harvest Batches</h2>
            <p className={styles.heroSub}>Historical ledger of verified harvest deliveries & admin pricing</p>
          </div>
        </div>

        {/* Lifetime Summary Pill */}
        {loading ? (
          <div className={`${styles.skeleton} ${styles.skeletonSummary}`} />
        ) : (
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>
              <span>🌾</span> Total Lifetime Silk Harvested
            </span>
            <span className={styles.summaryVal}>{totalKg} kg</span>
          </div>
        )}

        {/* Search Input */}
        <div className={styles.searchBox}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search by date or market location (e.g. Apr or Coimbatore)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {search && (
          <p className={styles.searchMetaText}>
            Showing {filtered.length} of {batches.length} matching batches
          </p>
        )}

        {/* Feed */}
        {loading ? (
          <div className={styles.batchFeed}>
            <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
            <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
            <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
          </div>
        ) : batches.length === 0 ? (
          <div className={styles.emptyState}>
            No batch history recorded yet. After your cocoon harvest is delivered and weighed by the admin team, your detailed rates, weight breakdowns (Good Silk, Waste, Doubles), and net amounts will appear here.
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            No historical batches match your search filter "{search}".
          </div>
        ) : (
          <div className={styles.batchFeed}>
            {filtered.map((b) => {
              const amount = b.displayFinalAmount ?? b.estimatedValue;
              return (
                <div
                  key={b._id}
                  className={styles.batchCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/batch-history/${b._id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/batch-history/${b._id}`)}
                >
                  <div className={styles.batchLeft}>
                    <div className={styles.batchDateTitle}>
                      <span>🗓️</span> {formatDateDayMonth(b.date)}
                    </div>
                    <div className={styles.batchSubText}>
                      📍 {b.location || 'Market'} Center · 📦 {displayTotalKg(b)} kg harvest
                    </div>
                    {amount > 0 && (
                      <div className={styles.batchAmountText}>
                        💰 Net Payout: {formatINR(amount)}
                      </div>
                    )}
                    <div className={styles.batchTapCue}>
                      Tap for weight breakdown & rates →
                    </div>
                  </div>

                  <div className={styles.batchRight}>
                    <Badge status="done" label="Completed" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
