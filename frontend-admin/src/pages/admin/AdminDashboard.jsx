import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { clearSession, deduplicatedGet } from '../../api/client';
import { formatDateDayMonth, todayDayMonthLabel } from '../../utils/format';
import styles from './AdminDashboard.module.css';

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
  const barW = 28;
  const gap = 12;
  const leftPad = 12;
  const rightPad = 12;
  const w = leftPad + rightPad + data.length * barW + (data.length - 1) * gap;
  const h = 140;

  return (
    <div className={styles.chartWrapper}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className={styles.chartSvg}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="barGradientLatest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Grid line */}
        <line x1={0} y1={h - 26} x2={w} y2={h - 26} stroke="#e2e8f0" strokeWidth="1.5" strokeDasharray="3 3" />

        {data.map((d, i) => {
          const scaled = (d.doneDays / max) * 85;
          const barH = d.doneDays > 0 ? Math.max(8, scaled) : 5;
          const x = leftPad + i * (barW + gap);
          const isLatest = i === data.length - 1;

          return (
            <g key={`${d.month}-${i}`} style={{ transition: 'all 0.2s' }}>
              {/* Bar background track */}
              <rect
                x={x}
                y={h - 26 - 85}
                width={barW}
                height={85}
                fill="#f1f5f9"
                rx={6}
              />
              {/* Actual data bar */}
              <rect
                x={x}
                y={h - 26 - barH}
                width={barW}
                height={barH}
                fill={isLatest ? 'url(#barGradientLatest)' : 'url(#barGradient)'}
                rx={6}
              />
              {/* Month label */}
              <text
                x={x + barW / 2}
                y={h - 8}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#64748b"
              >
                {d.month}
              </text>
              {/* Value text on top of bar */}
              {d.doneDays > 0 && (
                <text
                  x={x + barW / 2}
                  y={h - 32 - barH}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill={isLatest ? '#059669' : '#1d4ed8'}
                >
                  {d.doneDays}
                </text>
              )}
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
  const [todayLabel, setTodayLabel] = useState(() => todayDayMonthLabel());

  useEffect(() => {
    const refresh = () => setTodayLabel(todayDayMonthLabel());

    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 1, 0, 0);
      if (now >= next) next.setDate(next.getDate() + 1);
      return setTimeout(() => {
        refresh();
        timerId = scheduleNextMidnight();
      }, next.getTime() - now.getTime());
    };

    refresh();
    let timerId = scheduleNextMidnight();
    const poll = setInterval(refresh, 60_000);
    return () => {
      clearTimeout(timerId);
      clearInterval(poll);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    deduplicatedGet('/admin/dashboard-summary', {}, 30_000)
      .then((res) => {
        if (!isMounted) return;
        const { stats, chart, recentBookings } = res.data || {};
        setStats(stats || null);
        setChart(ensure12Months(chart));
        setBookings(recentBookings || []);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const logout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    clearSession();
    onLogout?.();
    navigate('/admin/login', { replace: true });
  };

  return (
    <AppShell title="TrackNow Admin">
      {loading ? (
        <div className="app-loading">
          <div className="spinner" />
        </div>
      ) : (
        <div className={styles.dashboardContainer}>
          {/* Welcome & Quick Action Banner */}
          <div className={styles.welcomeBanner}>
            <div className={styles.bannerTop}>
              <div className={styles.bannerGreeting}>
                <h2>Welcome Back, Admin 👋</h2>
                <p className={styles.sub}>TrackNow Sericulture Management System</p>
              </div>
              <div className={styles.dateChip}>
                <span>📅</span> {todayLabel}
              </div>
            </div>

            <div className={styles.quickActionsGrid}>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/users')}
              >
                <span className={styles.quickActionIcon}>👥</span> Users
              </button>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/bookings')}
              >
                <span className={styles.quickActionIcon}>📋</span> Bookings
              </button>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/batch-entry')}
              >
                <span className={styles.quickActionIcon}>🚛</span> Batch Entry
              </button>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/market-rates')}
              >
                <span className={styles.quickActionIcon}>📊</span> Market Rates
              </button>
              <button
                type="button"
                className={styles.quickActionBtn}
                onClick={() => navigate('/admin/tracker-control')}
              >
                <span className={styles.quickActionIcon}>📍</span> Live Tracker
              </button>
            </div>
          </div>

          {/* Key Metrics Stats Grid */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statTitle}>Total Accounts</span>
                <div className={`${styles.statIconBox} ${styles.iconBlue}`}>👥</div>
              </div>
              <div className={styles.statValue}>{stats?.totalAccounts ?? 0}</div>
              <div className={styles.statFooter}>
                <span className={`${styles.badgePill} ${styles.badgePillBlue}`}>
                  {stats?.totalUsers ?? 0} Users
                </span>
                <span>·</span>
                <span>{stats?.totalDrivers ?? 0} Drivers</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statTitle}>Pending Bookings</span>
                <div className={`${styles.statIconBox} ${styles.iconAmber}`}>⏳</div>
              </div>
              <div className={styles.statValue} style={{ color: '#b45309' }}>
                {stats?.pendingBookings ?? 0}
              </div>
              <div className={styles.statFooter}>
                <span className={`${styles.badgePill} ${styles.badgePillAmber}`}>
                  Action Required
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statTitle}>Active Accounts</span>
                <div className={`${styles.statIconBox} ${styles.iconGreen}`}>⚡</div>
              </div>
              <div className={styles.statValue} style={{ color: '#059669' }}>
                {stats?.activeAccounts ?? 0}
              </div>
              <div className={styles.statFooter}>
                <span className={`${styles.badgePill} ${styles.badgePillGreen}`}>
                  {stats?.activeUsers ?? 0} Active Users
                </span>
                <span>·</span>
                <span>{stats?.activeDrivers ?? 0} Active Drivers</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statTitle}>System Activity</span>
                <div className={`${styles.statIconBox} ${styles.iconIndigo}`}>📈</div>
              </div>
              <div className={styles.statValue} style={{ color: '#4f46e5' }}>
                {bookings?.length ?? 0}
              </div>
              <div className={styles.statFooter}>
                <span>Recent Bookings Tracked</span>
              </div>
            </div>
          </div>

          {/* Monthly Batch Chart Section */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitleText}>
                <span>📊</span> Monthly Done Days Overview
              </h3>
              <span className={styles.sectionBadge}>12 Months</span>
            </div>
            <BarChart data={chart} />
          </div>

          {/* Recent Bookings Feed Section */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeaderRow}>
              <h3 className={styles.sectionTitleText}>
                <span>📝</span> Recent Bookings
              </h3>
              <span
                className={styles.viewAllLink}
                onClick={() => navigate('/admin/bookings')}
              >
                View All →
              </span>
            </div>

            {bookings?.length === 0 ? (
              <div className={styles.emptyState}>No recent bookings found.</div>
            ) : (
              <div className={styles.bookingsList}>
                {bookings.map((b) => {
                  const userName = b.userName || b.userId?.name || 'Farmer User';
                  const initials = userName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div
                      key={b._id}
                      className={styles.bookingRow}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/admin/bookings/${b._id}`)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && navigate(`/admin/bookings/${b._id}`)
                      }
                    >
                      <div className={styles.bookingLeft}>
                        <div className={styles.userAvatar}>{initials}</div>
                        <div className={styles.bookingMeta}>
                          <div className={styles.bookingUserName}>{userName}</div>
                          <div className={styles.bookingSubDetails}>
                            <span>🗓️ {formatDateDayMonth(b.date)}</span>
                            {b.location && <span>📍 {b.location}</span>}
                            <span className={styles.chipTag}>{b.quantityKg} kg</span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.bookingRight}>
                        <span
                          className={`${styles.statusTag} ${
                            b.status === 'pending'
                              ? styles.statusPending
                              : styles.statusCompleted
                          }`}
                        >
                          {b.status}
                        </span>
                        <span className={styles.arrowIcon}>→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Profile & Logout Summary Footer */}
          <div className={styles.profileFooterCard}>
            <div className={styles.profileInfo}>
              <div className={styles.profileAvatar}>A</div>
              <div>
                <p className={styles.profileName}>Admin User</p>
                <p className={styles.profileRole}>System Administrator</p>
              </div>
            </div>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={logout}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
