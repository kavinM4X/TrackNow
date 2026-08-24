import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { deduplicatedGet } from '../../api/client';
import { formatINR } from '../../utils/format';
import styles from './DriverDashboard.module.css';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      deduplicatedGet('/admin/driver/stats', {}, 30_000),
      deduplicatedGet('/admin/driver/vehicles', {}, 30_000)
    ])
      .then(([s, v]) => {
        setStats(s.data);
        setVehicles(v.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Driver Dashboard" driverSection>
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Driver & Vehicle Operations</h2>
            <p className={styles.headerSub}>Vehicle rentals, cash advance tracking & expense logs</p>
          </div>
        </div>

        {/* Welcome & Quick Action Banner */}
        <div className={styles.welcomeBanner}>
          <div className={styles.bannerTop}>
            <div className={styles.bannerGreeting}>
              <h3>Fleet Operations Control 🚛</h3>
              <p className={styles.bannerSub}>Vehicle cash balances, driver expenses & party entries</p>
            </div>
          </div>

          <div className={styles.quickActionsGrid}>
            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => navigate('/admin/driver/vehicles')}
            >
              <span>🚚</span> Vehicles
            </button>
            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => navigate('/admin/driver/entries')}
            >
              <span>📋</span> Entries
            </button>
            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => navigate('/admin/driver/parties')}
            >
              <span>🤝</span> Parties
            </button>
            <button
              type="button"
              className={styles.quickActionBtn}
              onClick={() => navigate('/admin/driver/reports')}
            >
              <span>📊</span> Reports
            </button>
          </div>
        </div>

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Stat Cards Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statLabel}>Total Vehicle Cash</span>
                  <div className={`${styles.statIconBox} ${styles.iconGreen}`}>💵</div>
                </div>
                <div className={`${styles.statValue} ${styles.valPos}`}>
                  {formatINR(stats?.totalCash)}
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statLabel}>Advance Given</span>
                  <div className={`${styles.statIconBox} ${styles.iconBlue}`}>💳</div>
                </div>
                <div className={`${styles.statValue} ${styles.valBal}`}>
                  {formatINR(stats?.totalAdvance)}
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statLabel}>Total Expenses</span>
                  <div className={`${styles.statIconBox} ${styles.iconRed}`}>⛽</div>
                </div>
                <div className={`${styles.statValue} ${styles.valNeg}`}>
                  {formatINR(stats?.totalExpense)}
                </div>
              </div>

              <div
                className={styles.statCard}
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/admin/driver/entries')}
              >
                <div className={styles.statHeader}>
                  <span className={styles.statLabel}>Pending Entries</span>
                  <div className={`${styles.statIconBox} ${styles.iconAmber}`}>⏳</div>
                </div>
                <div className={`${styles.statValue} ${styles.valAmber}`}>
                  {stats?.pendingEntries ?? 0}
                </div>
              </div>
            </div>

            {/* Pending Notification Banner */}
            {stats?.pendingEntries > 0 && (
              <div className={styles.pendingBanner}>
                <span>⏳ You have {stats.pendingEntries} pending driver entries awaiting review.</span>
                <span className={styles.reviewLink} onClick={() => navigate('/admin/driver/entries')}>
                  Review Entries →
                </span>
              </div>
            )}

            {/* Vehicle Summary Section */}
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeaderRow}>
                <h3 className={styles.sectionTitle}>
                  <span>🚛</span> Registered Fleet Vehicles ({vehicles.length})
                </h3>
              </div>

              {vehicles.length === 0 ? (
                <div className={styles.emptyState}>No registered fleet vehicles found.</div>
              ) : (
                <div className={styles.vehiclesList}>
                  {vehicles.map((v) => (
                    <div
                      key={v._id}
                      className={styles.vehicleCard}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/driver/vehicles/${v._id}/expenses`)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' &&
                        navigate(`/admin/driver/vehicles/${v._id}/expenses`)
                      }
                    >
                      <div className={styles.vehicleHead}>
                        <div>
                          <h4 className={styles.vehicleNumber}>
                            <span>🚛</span> {v.vehicleNumber}
                          </h4>
                          <span className={styles.driverName}>Driver: {v.driverName || 'Unassigned'}</span>
                        </div>
                        <div className={styles.balanceBox}>
                          <div className={styles.balanceVal}>{formatINR(v.balance)}</div>
                          <span className={styles.balanceLbl}>Cash Balance</span>
                        </div>
                      </div>

                      <div className={styles.vehicleFoot}>
                        <span>Advance: <strong>{formatINR(v.advanceTotal)}</strong></span>
                        <span className={styles.expText}>Expenses: -{formatINR(v.expenseTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
