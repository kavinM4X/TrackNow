import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/common/Badge';
import api, { deduplicatedGet } from '../../api/client';
import { displayTotalKg, formatDateDayMonth, formatINR } from '../../utils/format';
import styles from './Dashboard.module.css';

const MARKET_LOCATIONS = [
  { label: 'Coimbatore', key: 'coimbatore', avgKey: 'coimbatoreAvg', minKey: 'coimbatoreMin', code: 'CBE' },
  { label: 'Mamballi', key: 'mamballi', avgKey: 'mamballiAvg', minKey: 'mamballiMin', code: 'MBL' },
  { label: 'Ramnagar', key: 'ramnagar', avgKey: 'ramnagarAvg', minKey: 'ramnagarMin', code: 'RNG' },
  { label: 'Dharmapuri', key: 'dharmapuri', avgKey: 'dharmapuriAvg', minKey: 'dharmapuriMin', code: 'DHP' }
];

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  // Independent state & loading for each section (progressive one-by-one loading)
  const [marketRate, setMarketRate] = useState(null);
  const [rateLoading, setRateLoading] = useState(true);

  const [upcoming, setUpcoming] = useState(null);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  const [stats, setStats] = useState({ totalBatches: 0, totalKg: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [recentBatches, setRecentBatches] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  const [rateIndex, setRateIndex] = useState(0);

  // Progressive section-by-section fetching (non-blocking)
  const loadMarketRate = useCallback(() => {
    deduplicatedGet('/market-rates/latest', {}, 60_000)
      .then((res) => setMarketRate(res.data))
      .catch((e) => console.error('Market rate load error:', e))
      .finally(() => setRateLoading(false));
  }, []);

  const loadUpcoming = useCallback(() => {
    deduplicatedGet('/bookings/upcoming', {}, 15_000)
      .then((res) => setUpcoming(res.data))
      .catch((e) => console.error('Upcoming booking load error:', e))
      .finally(() => setUpcomingLoading(false));
  }, []);

  const loadStats = useCallback(() => {
    deduplicatedGet('/batches/stats', {}, 30_000)
      .then((res) => setStats(res.data || { totalBatches: 0, totalKg: 0 }))
      .catch((e) => console.error('Stats load error:', e))
      .finally(() => setStatsLoading(false));
  }, []);

  const loadRecentBatches = useCallback(() => {
    deduplicatedGet('/batches/recent', {}, 15_000)
      .then((res) => setRecentBatches(res.data || []))
      .catch((e) => console.error('Recent batches load error:', e))
      .finally(() => setRecentLoading(false));
  }, []);

  useEffect(() => {
    // Fire all non-blocking queries immediately
    loadMarketRate();
    loadUpcoming();
    loadStats();
    loadRecentBatches();

    const interval = setInterval(() => {
      api.get('/market-rates/latest').then((r) => setMarketRate(r.data)).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMarketRate, loadUpcoming, loadStats, loadRecentBatches]);

  useEffect(() => {
    if (!marketRate) return undefined;
    const id = setInterval(() => {
      setRateIndex((i) => (i + 1) % MARKET_LOCATIONS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [marketRate]);

  const currentLoc = MARKET_LOCATIONS[rateIndex];
  const rateVal = marketRate ? marketRate[currentLoc.key] : null;
  const rateAvg = marketRate ? marketRate[currentLoc.avgKey] : null;
  const rateMin = marketRate ? marketRate[currentLoc.minKey] : null;

  const firstName = user?.name?.split(' ')[0] || 'Farmer';

  return (
    <AppShell
      title="TrackNow Dashboard"
      subtitle={`Welcome back, ${firstName} 👋`}
    >
      <div className={styles.dashboardContainer}>
        {/* Section 0: Welcome Banner & Quick Action Shortcuts (INSTANT 0ms Render) */}
        <div className={styles.welcomeBanner}>
          <div className={styles.welcomeHead}>
            <div>
              <h2 className={styles.welcomeTitle}>Hello, {firstName}! 🌾</h2>
              <p className={styles.welcomeSub}>Sericulture Logistics & Cocoon Trade Overview</p>
            </div>
            <span className={styles.roleChip}>Farmer Account</span>
          </div>

          {/* Quick Action Shortcuts */}
          <div className={styles.actionGrid}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate('/booking')}
            >
              <span className={styles.actionIcon}>➕</span>
              <span>New Booking</span>
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate('/batch-history')}
            >
              <span className={styles.actionIcon}>📦</span>
              <span>My Batches</span>
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate('/tracker')}
            >
              <span className={styles.actionIcon}>📍</span>
              <span>Live Tracker</span>
            </button>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => navigate('/settings')}
            >
              <span className={styles.actionIcon}>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Section 1: Live Market Rates Hero Card (Independent Shimmer Loading) */}
        {rateLoading ? (
          <div className={`${styles.skeleton} ${styles.skeletonRateCard}`} />
        ) : marketRate ? (
          <div className={styles.marketSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span>📈</span> Live Cocoon Market Rates
              </h3>
              <span className={styles.dateBadge}>
                🗓️ {formatDateDayMonth(marketRate.date || new Date())}
              </span>
            </div>

            <div className={styles.marketCard}>
              <div key={currentLoc.key} className={styles.marketSlide}>
                <div className={styles.marketLocMeta}>
                  <span className={styles.locBadge}>{currentLoc.label} Market ({currentLoc.code})</span>
                  <span className={styles.livePulse}>● LIVE</span>
                </div>

                <div className={styles.rateDisplay}>
                  <span className={styles.rateCurrency}>₹</span>
                  <span className={styles.rateNumber}>{rateVal ?? '—'}</span>
                  <span className={styles.rateUnit}>/ kg</span>
                </div>

                <div className={styles.rateBreakdownGrid}>
                  <div className={styles.breakdownPill}>
                    <span className={styles.breakdownLbl}>Average Rate</span>
                    <span className={styles.breakdownVal}>₹{rateAvg ?? '—'} / kg</span>
                  </div>
                  <div className={styles.breakdownPill}>
                    <span className={styles.breakdownLbl}>Minimum Rate</span>
                    <span className={styles.breakdownVal}>₹{rateMin ?? '—'} / kg</span>
                  </div>
                </div>
              </div>

              {/* Dot Pagination */}
              <div className={styles.dotsRow} aria-hidden>
                {MARKET_LOCATIONS.map((loc, i) => (
                  <button
                    key={loc.code}
                    type="button"
                    className={`${styles.dotBtn} ${i === rateIndex ? styles.dotBtnActive : ''}`}
                    onClick={() => setRateIndex(i)}
                    aria-label={`Show ${loc.label} rate`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Section 2: Upcoming Booking Card (Independent Shimmer Loading) */}
        {upcomingLoading ? (
          <div className={`${styles.skeleton} ${styles.skeletonCard}`} />
        ) : upcoming ? (
          <div className={styles.upcomingCard}>
            <div className={styles.upcomingHeader}>
              <div className={styles.upcomingTitleGroup}>
                <span className={styles.upcomingTag}>NEXT SCHEDULED BATCH</span>
                <h4 className={styles.upcomingMainText}>
                  📍 {upcoming.location} · 📦 {upcoming.quantityKg} kg
                </h4>
                <p className={styles.upcomingDateText}>
                  🗓️ Date: <strong>{formatDateDayMonth(upcoming.date)}</strong>
                </p>
              </div>
              <Badge status={upcoming.status} />
            </div>
          </div>
        ) : (
          <div className={styles.noUpcomingCard}>
            <div>
              <span className={styles.noUpcomingTitle}>No upcoming bookings scheduled</span>
              <p className={styles.noUpcomingSub}>Book your next silk batch pickup anytime</p>
            </div>
            <button
              type="button"
              className={styles.bookNowBtn}
              onClick={() => navigate('/booking')}
            >
              + Book Now
            </button>
          </div>
        )}

        {/* Section 3: Analytics Stats Grid (Independent Shimmer Loading) */}
        {statsLoading ? (
          <div className={styles.statsSection}>
            <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
            <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
          </div>
        ) : (
          <div className={styles.statsSection}>
            <div className={styles.statCard}>
              <div className={styles.statIconBox}>📦</div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{stats.totalBatches}</span>
                <span className={styles.statLabel}>Total Batches</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIconBox}>🌾</div>
              <div className={styles.statContent}>
                <span className={styles.statNumber}>{stats.totalKg} <small style={{ fontSize: 13, fontWeight: 500 }}>kg</small></span>
                <span className={styles.statLabel}>Total Silk Harvested</span>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Recent Batches Activity Feed (Independent Shimmer Loading) */}
        {recentLoading ? (
          <div className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span>📜</span> Recent Batch Activity
              </h3>
            </div>
            <div className={styles.batchList}>
              <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
              <div className={`${styles.skeleton} ${styles.skeletonRow}`} />
            </div>
          </div>
        ) : recentBatches.length > 0 ? (
          <div className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <span>📜</span> Recent Batch Activity
              </h3>
              <button
                type="button"
                className={styles.viewAllBtn}
                onClick={() => navigate('/batch-history')}
              >
                View All →
              </button>
            </div>

            <div className={styles.batchList}>
              {recentBatches.map((b) => (
                <div
                  key={b._id}
                  className={styles.batchCardRow}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/batch-history/${b._id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/batch-history/${b._id}`)}
                >
                  <div className={styles.batchLeft}>
                    <div className={styles.batchLocTitle}>
                      <span>📍</span> {b.location}
                    </div>
                    <div className={styles.batchMetaSub}>
                      🗓️ {formatDateDayMonth(b.date)} · 📦 {displayTotalKg(b)} kg silk
                    </div>
                  </div>

                  <div className={styles.batchRight}>
                    {b.estimatedValue > 0 && (
                      <span className={styles.batchValueBadge}>
                        {formatINR(b.estimatedValue)}
                      </span>
                    )}
                    <span className={styles.batchChevron}>→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
