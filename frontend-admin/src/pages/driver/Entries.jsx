import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../../components/layout/AppShell';
import api, { deduplicatedGet } from '../../api/client';
import { formatDateShort } from '../../utils/format';
import { groupEntries } from './entryShared';
import styles from './Entries.module.css';

export default function Entries() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = (status) => {
    setLoading(true);
    const q = status ? `?status=${status}` : '';
    deduplicatedGet(`/admin/driver/entries${q}`, {}, 15_000)
      .then((r) => setEntries(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(filter);
  }, [filter]);

  const groupedEntries = useMemo(() => groupEntries(entries), [entries]);

  const pendingCount = entries.filter((e) => e.status === 'pending').length;

  const openTrip = (group) => {
    navigate(
      `/admin/driver/entries/${encodeURIComponent(group.date)}/${encodeURIComponent(group.vehicleNumber)}`,
      { state: { filter } }
    );
  };

  return (
    <AppShell title="Driver Entries Review">
      <div className={styles.container}>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.headerTitleGroup}>
            <h2>Driver Entries Review</h2>
            <p className={styles.headerSub}>Review and approve vehicle trip entries submitted by drivers</p>
          </div>
          <div className={styles.pendingChip}>
            ⏳ {pendingCount} Pending Review
          </div>
        </div>

        {/* Filter Segmented Tabs */}
        <div className={styles.filterRow}>
          {[
            ['', 'All Entries'],
            ['pending', 'Pending Review'],
            ['approved', 'Approved'],
            ['rejected', 'Rejected']
          ].map(([val, label]) => (
            <button
              key={label}
              type="button"
              className={`${styles.filterChip} ${filter === val ? styles.filterChipOn : ''}`}
              onClick={() => setFilter(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <div className="app-loading">
            <div className="spinner" />
          </div>
        ) : groupedEntries.length === 0 ? (
          <div className={styles.emptyState}>No driver entries found matching this status filter.</div>
        ) : (
          <div className={styles.entriesFeed}>
            {groupedEntries.map((group) => {
              const pendingInGroup = group.items.filter((e) => e.status === 'pending').length;
              const approvedCount = group.items.filter((e) => e.status === 'approved').length;

              return (
                <button
                  key={`${group.date}::${group.vehicleNumber}`}
                  type="button"
                  className={styles.entryGroupCard}
                  onClick={() => openTrip(group)}
                >
                  <div className={styles.groupLeft}>
                    <div className={styles.groupTitle}>
                      <span>🚛</span> {group.vehicleNumber} · 🗓️ {formatDateShort(group.date)}
                    </div>
                    <div className={styles.groupSub}>
                      <span>👤 Driver: {group.driverName || 'Unassigned'}</span>
                      <span>·</span>
                      <span>👥 {group.items.length} farmer entry{group.items.length !== 1 ? 's' : ''}</span>
                      {approvedCount > 0 && <span>(✓ {approvedCount} approved)</span>}
                    </div>
                  </div>

                  <div className={styles.groupRight}>
                    {pendingInGroup > 0 && (
                      <span className={styles.pendingBadge}>
                        ⏳ {pendingInGroup} pending
                      </span>
                    )}
                    <span className={styles.chevron}>→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
