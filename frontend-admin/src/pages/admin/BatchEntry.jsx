import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { deduplicatedGet } from '../../api/client';
import { formatDateShort } from '../../utils/format';
import styles from './BatchEntryDashboard.module.css';

export default function BatchEntry() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ totalDates: 0, totalUsers: 0, totalWeightKg: 0 });
  const [byDate, setByDate] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set('search', search.trim());
      if (dateFilter) queryParams.set('date', dateFilter);
      const url = `/admin/bookings/date-summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const res = await deduplicatedGet(url, {}, 15_000);
      setSummary(res.data.summary || { totalDates: 0, totalUsers: 0, totalWeightKg: 0 });
      setByDate(res.data.byDate || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load booking summary');
      setByDate([]);
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const hasFilters = Boolean(search.trim() || dateFilter);

  const clearFilters = () => {
    setSearch('');
    setDateFilter('');
  };

  return (
    <AppShell title="Batch Entry Logistics" backPath="/admin/dashboard">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Batch Entry Logistics</h2>
            <p className={styles.headerSub}>Date-wise booking summary for transport & vehicle allocation</p>
          </div>
        </div>

        {/* Summary Stats Row */}
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconBlue}`}>📅</div>
            <div className={styles.summaryMeta}>
              <div className={styles.summaryValue}>{summary.totalDates}</div>
              <div className={styles.summaryLabel}>Total Dates</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconGreen}`}>👥</div>
            <div className={styles.summaryMeta}>
              <div className={styles.summaryValue}>{summary.totalUsers}</div>
              <div className={styles.summaryLabel}>Total Farmers / Users</div>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={`${styles.summaryIconBox} ${styles.summaryIconAmber}`}>📦</div>
            <div className={styles.summaryMeta}>
              <div className={styles.summaryValue}>{summary.totalWeightKg} <span style={{ fontSize: 14 }}>kg</span></div>
              <div className={styles.summaryLabel}>Total Weight (kg)</div>
            </div>
          </div>
        </div>

        {/* Filter Card Bar */}
        <div className={styles.filterCard}>
          <div className={styles.filterRow}>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Search</label>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search date, farmer, location, market..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.filterField}>
              <label className={styles.filterLabel}>Filter by date</label>
              <input
                type="date"
                className={styles.dateInput}
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            {hasFilters && (
              <button type="button" className={styles.clearBtn} onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        {/* Table & Mobile List Section */}
        <div className={styles.tableCard}>
          <div className={styles.tableHead}>
            <h3 className={styles.tableTitle}>
              <span>🚚</span> Bookings Grouped by Date of Going
            </h3>
            <span className={styles.tableMeta}>
              {byDate.length} date{byDate.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="app-loading">
              <div className="spinner" />
            </div>
          ) : byDate.length === 0 ? (
            <div className={styles.emptyState}>
              {hasFilters ? 'No bookings match your filter query' : 'No batch bookings recorded yet'}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date of Going</th>
                      <th>Total Farmers</th>
                      <th>Total Weight (kg)</th>
                      <th className={styles.actionCell}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDate.map((row) => (
                      <tr key={row.date}>
                        <td>
                          <strong>🗓️ {formatDateShort(row.date)}</strong>
                          <span className={styles.dateRaw}>{row.date}</span>
                        </td>
                        <td>👥 {row.userCount} farmers</td>
                        <td>
                          <strong className={styles.weightVal}>📦 {row.totalWeightKg} kg</strong>
                        </td>
                        <td className={styles.actionCell}>
                          <button
                            type="button"
                            className={styles.viewBtn}
                            onClick={() =>
                              navigate(`/admin/batch-entry/${encodeURIComponent(row.date)}`, {
                                state: { row }
                              })
                            }
                          >
                            View Details →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Feed View */}
              <div className={styles.mobileList}>
                {byDate.map((row) => (
                  <div key={row.date} className={styles.mobileRow}>
                    <div className={styles.mobileRowTop}>
                      <div>
                        <strong>🗓️ {formatDateShort(row.date)}</strong>
                        <div className={styles.dateRaw}>{row.date}</div>
                      </div>
                      <span className={styles.mobileWeight}>{row.totalWeightKg} kg</span>
                    </div>
                    <div className={styles.mobileRowMeta}>
                      👥 {row.userCount} farmer{row.userCount !== 1 ? 's' : ''} booked for this date
                    </div>
                    <button
                      type="button"
                      className={styles.viewBtn}
                      onClick={() =>
                        navigate(`/admin/batch-entry/${encodeURIComponent(row.date)}`, {
                          state: { row }
                        })
                      }
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
